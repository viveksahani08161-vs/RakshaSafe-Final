import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Incident } from '../models/Incident.js'
import { IncidentUpdate } from '../models/IncidentUpdate.js'
import { Location } from '../models/Location.js'
import {
  Notification,
  NotificationChannel,
} from '../models/Notification.js'
import { RescueAssignment, AssignmentStatus, type IRescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { User } from '../models/User.js'
import { badRequest, forbidden, notFoundError, unauthorized } from '../utils/errors.js'
import { recordEventSafe } from '../services/notifications.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { toSafeIncident, toSafeLocation } from './incidentController.js'
import { toSafeNotification } from './notificationController.js'
import {
  ALLOWED_ASSIGNMENT_TRANSITIONS,
  attachTeams,
  type SafeAssignment,
} from './adminAssignmentController.js'

function requireResponderId(req: Request): string {
  const userId = req.auth?.userId
  if (!userId) throw unauthorized('Authentication required.')
  if (req.auth?.role !== 'RESPONDER') throw forbidden('Responder access required.')
  return userId
}

/** Teams the caller belongs to (membership is managed by administrators). */
async function myTeamIds(responderId: string): Promise<string[]> {
  const teams = await RescueTeam.find({ members: responderId }).select('_id')
  return teams.map((t) => String(t._id))
}

/**
 * GET /api/responder/assignments — assignments for the caller's own teams,
 * newest first. A responder only ever sees incidents assigned to their teams.
 */
export async function listMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const responderId = requireResponderId(req)
    const teamIds = await myTeamIds(responderId)
    if (teamIds.length === 0) {
      res.json({ success: true, data: { assignments: [] } })
      return
    }
    const docs = await RescueAssignment.find({ teamId: { $in: teamIds } }).sort({ createdAt: -1 }).limit(100)
    const assignments: SafeAssignment[] = await attachTeams(docs)

    const incidentIds = [...new Set(docs.map((d) => String(d.incidentId)))]
    const incidents = await Incident.find({ _id: { $in: incidentIds } })
    const incidentMap = new Map(incidents.map((i) => [String(i._id), toSafeIncident(i)]))

    res.json({
      success: true,
      data: {
        assignments: assignments.map((a) => ({
          ...a,
          incident: incidentMap.get(a.incidentId) ?? null,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/responder/notifications — In-App notifications for incidents
 * assigned to the caller's teams, newest first. Only the In-App channel is
 * served here: contact-channel records reference the incident owner's
 * private contacts and must never leak to responders.
 */
export async function listMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const responderId = requireResponderId(req)
    const teamIds = await myTeamIds(responderId)
    if (teamIds.length === 0) {
      res.json({ success: true, data: { notifications: [] } })
      return
    }
    const assignments = await RescueAssignment.find({ teamId: { $in: teamIds } }).select('incidentId')
    const incidentIds = [...new Set(assignments.map((a) => String(a.incidentId)))]
    if (incidentIds.length === 0) {
      res.json({ success: true, data: { notifications: [] } })
      return
    }
    const [docs, incidents] = await Promise.all([
      Notification.find({ incidentId: { $in: incidentIds }, channel: NotificationChannel.IN_APP })
        .sort({ createdAt: -1 })
        .limit(50),
      Incident.find({ _id: { $in: incidentIds } }).select('category status'),
    ])
    const incidentMap = new Map(
      incidents.map((i) => [String(i._id), { id: String(i._id), category: i.category, status: i.status }]),
    )
    res.json({
      success: true,
      data: {
        notifications: docs.map((d) =>
          toSafeNotification(d, incidentMap.get(String(d.incidentId)) ?? null),
        ),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/responder/incidents/:id — incident detail scoped to the caller's
 * teams. Includes description, location, assignment history and status
 * history so the responder has the context needed to respond. Reporter
 * contact is limited to name + phone (operational need-to-know only).
 */
export async function getMyIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const responderId = requireResponderId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }

    const teamIds = await myTeamIds(responderId)
    const assignmentDocs: IRescueAssignment[] =
      teamIds.length > 0
        ? await RescueAssignment.find({ incidentId: id, teamId: { $in: teamIds } }).sort({ createdAt: -1 })
        : []
    if (assignmentDocs.length === 0) {
      next(notFoundError('Incident not found.'))
      return
    }

    const doc = await Incident.findById(id)
    if (!doc) {
      next(notFoundError('Incident not found.'))
      return
    }
    const [location, updates, reporter] = await Promise.all([
      doc.locationId ? Location.findById(doc.locationId) : Promise.resolve(null),
      IncidentUpdate.find({ incidentId: doc._id }).sort({ createdAt: 1 }),
      User.findById(doc.userId).select('name phone'),
    ])

    res.json({
      success: true,
      data: {
        incident: toSafeIncident(doc),
        location: location ? toSafeLocation(location) : null,
        reporter: reporter ? { name: reporter.name, phone: reporter.phone } : null,
        assignments: await attachTeams(
          await RescueAssignment.find({ incidentId: doc._id }).sort({ createdAt: -1 }),
        ),
        updates: updates.map((u) => ({
          id: String(u._id),
          statusFrom: u.statusFrom ?? null,
          statusTo: u.statusTo,
          ...(u.comment ? { comment: u.comment } : {}),
          updatedBy: String(u.updatedBy),
          createdAt: u.createdAt,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/responder/assignments/:id — the responder moves their own team's
 * assignment along the documented workflow (ASSIGNED → EN_ROUTE → ON_SCENE →
 * COMPLETED, plus CANCELLED). Same states as the admin flow — no duplicate
 * status system. The incident owner is notified of the change.
 */
export async function updateMyAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const responderId = requireResponderId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid assignment id.'))
      return
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    const allowedStatuses = Object.values(AssignmentStatus) as string[]
    if (typeof body.status !== 'string' || !allowedStatuses.includes(body.status)) {
      next(
        badRequest('Invalid assignment data.', [
          { field: 'status', message: `Status must be one of: ${allowedStatuses.join(', ')}.` },
        ]),
      )
      return
    }
    const nextStatus = body.status as AssignmentStatus

    const teamIds = await myTeamIds(responderId)
    const doc = await RescueAssignment.findById(id)
    if (!doc || !teamIds.includes(String(doc.teamId))) {
      next(notFoundError('Assignment not found.'))
      return
    }

    const allowed = ALLOWED_ASSIGNMENT_TRANSITIONS[doc.status]
    if (!allowed.includes(nextStatus)) {
      next(
        badRequest('Invalid assignment data.', [
          {
            field: 'status',
            message:
              allowed.length > 0
                ? `Cannot move from ${doc.status} to ${nextStatus}. Allowed: ${allowed.join(', ')}.`
                : `Assignment is ${doc.status}; its status can no longer change.`,
          },
        ]),
      )
      return
    }

    const statusFrom = doc.status
    doc.status = nextStatus
    await doc.save()

    const team = await RescueTeam.findById(doc.teamId)
    const incident = await Incident.findById(doc.incidentId).select('_id userId')

    await AdminLog.create({
      adminId: responderId,
      action: 'assignment.responder.update',
      targetType: 'RescueAssignments',
      targetId: doc._id,
      details: `${team?.name ?? 'team'}: ${statusFrom} -> ${nextStatus}`,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })

    if (incident) {
      await recordEventSafe(String(incident._id), String(incident.userId), {
        kind: 'incident.assignment.updated',
        teamName: team?.name ?? 'Rescue team',
        from: statusFrom,
        to: nextStatus,
      })
    }

    const [updated] = await attachTeams([doc])
    res.json({ success: true, data: { assignment: updated } })
  } catch (err) {
    next(err)
  }
}
