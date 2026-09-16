import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Incident, IncidentPriority, IncidentStatus, IncidentType } from '../models/Incident.js'
import { IncidentUpdate } from '../models/IncidentUpdate.js'
import { Location } from '../models/Location.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { User } from '../models/User.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { recordEventSafe } from '../services/notifications.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import type { ValidationIssue } from '../validators/auth.js'
import { toSafeIncident, toSafeLocation } from './incidentController.js'
import { attachTeams } from './adminAssignmentController.js'
import { toSafeUser } from './authController.js'

const MAX_LIMIT = 50
const TERMINAL_STATUSES = [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]

/**
 * Documented workflow (Chapter 3 §3.4.1.5):
 * REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED,
 * with CANCELLED allowed from any non-terminal status.
 */
const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.REPORTED]: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.CANCELLED],
  [IncidentStatus.ACKNOWLEDGED]: [IncidentStatus.ASSIGNED, IncidentStatus.CANCELLED],
  [IncidentStatus.ASSIGNED]: [IncidentStatus.IN_PROGRESS, IncidentStatus.CANCELLED],
  [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
  [IncidentStatus.CANCELLED]: [],
}

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function validateStatusBody(body: unknown): { status?: IncidentStatus; comment?: string; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  let status: IncidentStatus | undefined
  const allowed = Object.values(IncidentStatus) as string[]
  if (typeof b.status === 'string' && allowed.includes(b.status)) {
    status = b.status as IncidentStatus
  } else {
    issues.push({ field: 'status', message: `Status must be one of: ${allowed.join(', ')}.` })
  }

  let comment: string | undefined
  if (b.comment !== undefined) {
    const text = typeof b.comment === 'string' ? b.comment.trim() : ''
    if (text.length > 500) {
      issues.push({ field: 'comment', message: 'Comment must be at most 500 characters.' })
    } else if (text !== '') {
      comment = text
    }
  }

  if (issues.length > 0) return { issues }
  return { status, ...(comment ? { comment } : {}) }
}

/**
 * GET /api/admin/incidents — paginated, filterable incident list.
 * Filters: status, priority, type (validated enums), search (category/description).
 */
export async function listIncidentsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = {}

    if (req.query.status !== undefined) {
      const allowed = Object.values(IncidentStatus) as string[]
      if (typeof req.query.status !== 'string' || !allowed.includes(req.query.status)) {
        next(badRequest('Invalid status filter.', [{ field: 'status', message: `Status must be one of: ${allowed.join(', ')}.` }]))
        return
      }
      filter.status = req.query.status
    }
    if (req.query.priority !== undefined) {
      const allowed = Object.values(IncidentPriority) as string[]
      if (typeof req.query.priority !== 'string' || !allowed.includes(req.query.priority)) {
        next(badRequest('Invalid priority filter.', [{ field: 'priority', message: `Priority must be one of: ${allowed.join(', ')}.` }]))
        return
      }
      filter.priority = req.query.priority
    }
    if (req.query.type !== undefined) {
      const allowed = Object.values(IncidentType) as string[]
      if (typeof req.query.type !== 'string' || !allowed.includes(req.query.type)) {
        next(badRequest('Invalid type filter.', [{ field: 'type', message: 'Type must be Safety or Disaster.' }]))
        return
      }
      filter.type = req.query.type
    }
    if (typeof req.query.search === 'string' && req.query.search.trim() !== '') {
      const q = escapeRegExp(req.query.search.trim().slice(0, 100))
      filter.$or = [{ category: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }]
    }

    const [docs, total] = await Promise.all([
      Incident.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Incident.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        incidents: docs.map(toSafeIncident),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/incidents/:id — incident with reporter, location,
 * chronological updates and any rescue assignments.
 */
export async function getIncidentAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }

    const doc = await Incident.findById(id)
    if (!doc) {
      next(notFoundError('Incident not found.'))
      return
    }

    const [reporter, location, updates, assignments] = await Promise.all([
      User.findById(doc.userId).select('-passwordHash'),
      doc.locationId ? Location.findById(doc.locationId) : Promise.resolve(null),
      IncidentUpdate.find({ incidentId: doc._id }).sort({ createdAt: 1 }),
      RescueAssignment.find({ incidentId: doc._id }).sort({ createdAt: -1 }),
    ])

    res.json({
      success: true,
      data: {
        incident: toSafeIncident(doc),
        reporter: reporter ? toSafeUser(reporter) : null,
        location: location ? toSafeLocation(location) : null,
        updates: updates.map((u) => ({
          id: String(u._id),
          statusFrom: u.statusFrom ?? null,
          statusTo: u.statusTo,
          ...(u.comment ? { comment: u.comment } : {}),
          updatedBy: String(u.updatedBy),
          createdAt: u.createdAt,
        })),
        assignments: await attachTeams(assignments),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/incidents/:id/status — change status, record the change as
 * an IncidentUpdate, and log the administrative action. resolvedAt is set when
 * entering RESOLVED/CLOSED and cleared when leaving them.
 */
export async function updateIncidentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }
    const { status, comment, issues } = validateStatusBody(req.body)
    if (!status || issues) {
      next(badRequest('Invalid status data.', issues))
      return
    }

    const doc = await Incident.findById(id)
    if (!doc) {
      next(notFoundError('Incident not found.'))
      return
    }
    const allowed = ALLOWED_TRANSITIONS[doc.status]
    if (!allowed.includes(status)) {
      next(
        badRequest('Invalid status data.', [
          {
            field: 'status',
            message:
              allowed.length > 0
                ? `Cannot move from ${doc.status} to ${status}. Allowed: ${allowed.join(', ')}.`
                : `Incident is ${doc.status}; its status can no longer change.`,
          },
        ]),
      )
      return
    }

    // Incident is saved first so a history record is never created
    // for an update that did not actually occur. If history creation
    // then fails, the error path (never success) is returned instead.
    const statusFrom = doc.status
    doc.status = status
    if (TERMINAL_STATUSES.includes(status)) {
      doc.resolvedAt = new Date()
    }
    await doc.save()

    const update = await IncidentUpdate.create({
      incidentId: doc._id,
      updatedBy: adminId,
      statusFrom,
      statusTo: status,
      ...(comment ? { comment } : {}),
    })

    await AdminLog.create({
      adminId,
      action: 'incident.status.update',
      targetType: 'Incidents',
      targetId: doc._id,
      details: `${statusFrom} -> ${status}${comment ? `: ${comment}` : ''}`,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })

    // Real event for the incident owner (and opted contact channels).
    await recordEventSafe(String(doc._id), String(doc.userId), {
      kind: 'incident.status.changed',
      from: statusFrom,
      to: status,
    })

    res.json({
      success: true,
      data: {
        incident: toSafeIncident(doc),
        update: {
          id: String(update._id),
          statusFrom: update.statusFrom ?? null,
          statusTo: update.statusTo,
          ...(update.comment ? { comment: update.comment } : {}),
          updatedBy: String(update.updatedBy),
          createdAt: update.createdAt,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/incidents/summary — counts by status plus totals, from stored data. */
export async function getIncidentsSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const grouped = await Incident.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const byStatus: Record<string, number> = {}
    for (const g of grouped) byStatus[g._id] = g.count
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0)
    const active =
      (byStatus[IncidentStatus.REPORTED] ?? 0) +
      (byStatus[IncidentStatus.ACKNOWLEDGED] ?? 0) +
      (byStatus[IncidentStatus.ASSIGNED] ?? 0) +
      (byStatus[IncidentStatus.IN_PROGRESS] ?? 0)

    res.json({ success: true, data: { total, active, byStatus } })
  } catch (err) {
    next(err)
  }
}
