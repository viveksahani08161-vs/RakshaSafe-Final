import type { NextFunction, Request, Response } from 'express'
import { Incident } from '../models/Incident.js'
import { IncidentUpdate } from '../models/IncidentUpdate.js'
import { Location } from '../models/Location.js'
import { Notification } from '../models/Notification.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { RiskAssessment } from '../models/RiskAssessment.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { User } from '../models/User.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { toSafeIncident, toSafeLocation } from './incidentController.js'
import { toSafeUser } from './authController.js'
import { toSafeNotification } from './notificationController.js'
import { toSafeUnsafeReport } from './unsafeReportController.js'
import { attachTeams } from './adminAssignmentController.js'

const MAX_LIMIT = 50

/**
 * GET /api/admin/users — paginated user list (admin only, no password hashes).
 * Optional `?search=` matches name, email, or phone (case-insensitive,
 * regex-escaped, truncated). Passwords are never searchable.
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (typeof req.query.search === 'string' && req.query.search.trim() !== '') {
      const rx = { $regex: escapeRegExp(req.query.search.trim().slice(0, 100)), $options: 'i' }
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        users: users.map(toSafeUser),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/notifications — system-wide notification records, newest first (dashboard support). Accepts an optional `?incidentId=` filter for per-incident monitoring. */
export async function listNotificationsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = {}

    if (req.query.incidentId !== undefined) {
      if (typeof req.query.incidentId !== 'string' || !isValidObjectId(req.query.incidentId)) {
        next(badRequest('Invalid incident filter.', [{ field: 'incidentId', message: 'Must be a valid id.' }]))
        return
      }
      filter.incidentId = req.query.incidentId
    }

    const [docs, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: {
        notifications: docs.map((d) => toSafeNotification(d, null)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/users/:id — get a single user's complete profile and activity.
 * Admin-only endpoint: requires ADMIN role. Returns user profile, incidents,
 * locations, assignments, history, risk assessments, and notifications.
 */
export async function getUserAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid user id.', [{ field: 'id', message: 'Must be a valid ObjectId.' }]))
      return
    }

    const user = await User.findById(id).select('-passwordHash')
    if (!user) {
      next(notFoundError('User not found.'))
      return
    }

    // Fetch all incidents by this user
    const incidents = await Incident.find({ userId: user._id }).sort({ createdAt: -1 })

    // Fetch locations for incidents
    const locationIds = [...new Set(incidents.map((i) => i.locationId).filter(Boolean))]
    const locations = locationIds.length > 0 ? await Location.find({ _id: { $in: locationIds } }) : []
    const locationMap = new Map(locations.map((l) => [String(l._id), toSafeLocation(l)]))

    // Build incidents with location data
    const incidentsWithLocation = incidents.map((incident) => ({
      ...toSafeIncident(incident),
      location: incident.locationId ? locationMap.get(String(incident.locationId)) ?? null : null,
    }))

    // Fetch assignments for user's incidents
    const incidentIds = incidents.map((i) => String(i._id))
    const assignments = incidentIds.length > 0
      ? await RescueAssignment.find({ incidentId: { $in: incidentIds } }).sort({ createdAt: -1 })
      : []
    const assignmentsWithTeams = await attachTeams(assignments)

    // Fetch incident updates (history) for user's incidents
    const updates = incidentIds.length > 0
      ? await IncidentUpdate.find({ incidentId: { $in: incidentIds } }).sort({ createdAt: 1 })
      : []

    // Fetch risk assessments for user's incidents (via location)
    const riskAssessments = locationIds.length > 0
      ? await RiskAssessment.find({ locationId: { $in: locationIds } }).sort({ assessedAt: -1 })
      : []

    // Fetch notifications for user's incidents
    const notifications = incidentIds.length > 0
      ? await Notification.find({ incidentId: { $in: incidentIds } }).sort({ createdAt: -1 })
      : []

    // Fetch unsafe area reports by this user
    const unsafeReports = await UnsafeAreaReport.find({ reportedBy: user._id }).sort({ createdAt: -1 })

    // Fetch locations for unsafe reports
    const unsafeReportLocationIds = [...new Set(unsafeReports.map((r) => r.locationId).filter(Boolean))]
    const unsafeReportLocations = unsafeReportLocationIds.length > 0
      ? await Location.find({ _id: { $in: unsafeReportLocationIds } })
      : []
    const unsafeReportLocationMap = new Map(
      unsafeReportLocations.map((l) => [String(l._id), toSafeLocation(l)])
    )

    const unsafeReportsWithLocation = unsafeReports.map((report) => {
      const location = report.locationId
        ? (unsafeReportLocationMap.get(String(report.locationId)) ?? null)
        : null
      return toSafeUnsafeReport(report, location)
    })

    res.json({
      success: true,
      data: {
        user: toSafeUser(user),
        incidents: incidentsWithLocation,
        assignments: assignmentsWithTeams,
        history: updates.map((u) => ({
          id: String(u._id),
          incidentId: String(u.incidentId),
          statusFrom: u.statusFrom ?? null,
          statusTo: u.statusTo,
          ...(u.comment ? { comment: u.comment } : {}),
          updatedBy: String(u.updatedBy),
          createdAt: u.createdAt,
        })),
        riskAssessments: riskAssessments.map((r) => ({
          id: String(r._id),
          locationId: String(r.locationId),
          riskScore: r.riskScore,
          riskLevel: r.riskLevel,
          modelVersion: r.modelVersion,
          inputFactors: r.inputFactors ?? [],
          assessedAt: r.assessedAt,
          createdAt: r.createdAt,
        })),
        notifications: notifications.map((n) => toSafeNotification(n, null)),
        unsafeReports: unsafeReportsWithLocation,
      },
    })
  } catch (err) {
    next(err)
  }
}
