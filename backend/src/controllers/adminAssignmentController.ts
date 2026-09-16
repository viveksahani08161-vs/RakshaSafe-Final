import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Incident } from '../models/Incident.js'
import { RescueAssignment, AssignmentStatus, type IRescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam, type IRescueTeam } from '../models/RescueTeam.js'
import { badRequest, conflict, notFoundError, unauthorized } from '../utils/errors.js'
import { recordEventSafe } from '../services/notifications.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateAssignmentCreate, validateAssignmentUpdate } from '../validators/assignment.js'

export interface SafeTeamRef {
  id: string
  name: string
  teamType: string
  phone: string
}

export interface SafeAssignment {
  id: string
  incidentId: string
  team: SafeTeamRef | null
  teamId: string
  assignedBy: string
  status: string
  assignedAt: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export function toSafeTeamRef(doc: IRescueTeam): SafeTeamRef {
  return { id: String(doc._id), name: doc.name, teamType: doc.teamType, phone: doc.phone }
}

export function toSafeAssignment(doc: IRescueAssignment, team: IRescueTeam | null): SafeAssignment {
  return {
    id: String(doc._id),
    incidentId: String(doc.incidentId),
    team: team ? toSafeTeamRef(team) : null,
    teamId: String(doc.teamId),
    assignedBy: String(doc.assignedBy),
    status: doc.status,
    assignedAt: doc.assignedAt,
    ...(doc.notes ? { notes: doc.notes } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/** Batch-load teams for assignment lists. */
export async function attachTeams(docs: IRescueAssignment[]): Promise<SafeAssignment[]> {
  const ids = [...new Set(docs.map((d) => String(d.teamId)))]
  const teams = ids.length > 0 ? await RescueTeam.find({ _id: { $in: ids } }) : []
  const map = new Map(teams.map((t) => [String(t._id), t]))
  return docs.map((d) => toSafeAssignment(d, map.get(String(d.teamId)) ?? null))
}

/**
 * Documented assignment workflow: ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED,
 * with CANCELLED allowed from any non-terminal status.
 */
const ALLOWED_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.ASSIGNED]: [AssignmentStatus.EN_ROUTE, AssignmentStatus.CANCELLED],
  [AssignmentStatus.EN_ROUTE]: [AssignmentStatus.ON_SCENE, AssignmentStatus.CANCELLED],
  [AssignmentStatus.ON_SCENE]: [AssignmentStatus.COMPLETED, AssignmentStatus.CANCELLED],
  [AssignmentStatus.COMPLETED]: [],
  [AssignmentStatus.CANCELLED]: [],
}

const ACTIVE_STATUSES = [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE]

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

async function logAdmin(req: Request, adminId: string, action: string, targetId: string, details: string): Promise<void> {
  await AdminLog.create({
    adminId,
    action,
    targetType: 'RescueAssignments',
    targetId,
    details,
    ...(req.ip ? { ipAddress: req.ip } : {}),
  })
}

/**
 * POST /api/admin/incidents/:id/assignments — assign a registered, active
 * team to an incident. No orphan records: incident and team must exist, the
 * team must be active, and a duplicate active assignment is rejected.
 * Incident status is intentionally untouched (Phase 4 flow stays explicit).
 */
export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id: incidentId } = req.params
    if (!isValidObjectId(incidentId)) {
      next(badRequest('Invalid incident id.'))
      return
    }
    const { input, issues } = validateAssignmentCreate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid assignment data.', issues))
      return
    }

    const incident = await Incident.findById(incidentId).select('_id userId')
    if (!incident) {
      next(notFoundError('Incident not found.'))
      return
    }
    const team = await RescueTeam.findById(input.teamId)
    if (!team) {
      next(badRequest('Invalid assignment data.', [{ field: 'teamId', message: 'Rescue team not found.' }]))
      return
    }
    if (!team.isActive) {
      next(badRequest('Invalid assignment data.', [{ field: 'teamId', message: 'Rescue team is not active.' }]))
      return
    }
    const existing = await RescueAssignment.findOne({
      incidentId: incident._id,
      teamId: team._id,
      status: { $in: ACTIVE_STATUSES },
    }).select('_id')
    if (existing) {
      next(conflict('This team already has an active assignment for the incident.'))
      return
    }

    const doc = await RescueAssignment.create({
      incidentId: incident._id,
      teamId: team._id,
      assignedBy: adminId,
      status: AssignmentStatus.ASSIGNED,
      ...(input.notes ? { notes: input.notes } : {}),
    })
    await logAdmin(req, adminId, 'assignment.create', String(doc._id), `incident ${incidentId} -> team ${team.name}`)

    // Real event for the incident owner (and opted contact channels).
    await recordEventSafe(String(incident._id), String(incident.userId), {
      kind: 'incident.assigned',
      teamName: team.name,
    })

    res.status(201).json({ success: true, data: { assignment: toSafeAssignment(doc, team) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/incidents/:id/assignments — assignments of one incident, newest first. */
export async function listIncidentAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: incidentId } = req.params
    if (!isValidObjectId(incidentId)) {
      next(badRequest('Invalid incident id.'))
      return
    }
    const incident = await Incident.findById(incidentId).select('_id')
    if (!incident) {
      next(notFoundError('Incident not found.'))
      return
    }
    const docs = await RescueAssignment.find({ incidentId: incident._id }).sort({ createdAt: -1 })
    res.json({ success: true, data: { assignments: await attachTeams(docs) } })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/assignments/:id — change assignment status along the
 * documented workflow and/or replace notes (empty string clears).
 */
export async function updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid assignment id.'))
      return
    }
    const { input, issues } = validateAssignmentUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid assignment data.', issues))
      return
    }

    const doc = await RescueAssignment.findById(id)
    if (!doc) {
      next(notFoundError('Assignment not found.'))
      return
    }
    if (input.status !== undefined) {
      const allowed = ALLOWED_TRANSITIONS[doc.status]
      if (!allowed.includes(input.status)) {
        next(
          badRequest('Invalid assignment data.', [
            {
              field: 'status',
              message:
                allowed.length > 0
                  ? `Cannot move from ${doc.status} to ${input.status}. Allowed: ${allowed.join(', ')}.`
                  : `Assignment is ${doc.status}; its status can no longer change.`,
            },
          ]),
        )
        return
      }
      doc.status = input.status
    }
    if ('notes' in input) doc.notes = input.notes
    await doc.save()
    await logAdmin(req, adminId, 'assignment.update', String(doc._id), `status ${doc.status}`)

    const team = await RescueTeam.findById(doc.teamId)
    res.json({ success: true, data: { assignment: toSafeAssignment(doc, team) } })
  } catch (err) {
    next(err)
  }
}
