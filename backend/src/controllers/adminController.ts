import type { NextFunction, Request, Response } from 'express'
import { EmergencyContact } from '../models/EmergencyContact.js'
import { Facility } from '../models/Facility.js'
import { Incident } from '../models/Incident.js'
import { IncidentUpdate } from '../models/IncidentUpdate.js'
import { Location } from '../models/Location.js'
import { Report } from '../models/Report.js'
import { Notification } from '../models/Notification.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { RiskAssessment } from '../models/RiskAssessment.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { User, UserRole } from '../models/User.js'
import { AdminLog } from '../models/AdminLog.js'
import { badRequest, conflict, notFoundError, unauthorized } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { toSafeContact } from './emergencyContactController.js'
import { toSafeIncident, toSafeLocation } from './incidentController.js'
import { toSafeUser } from './authController.js'
import { toSafeNotification } from './notificationController.js'
import { toSafeUnsafeReport } from './unsafeReportController.js'
import { attachTeams } from './adminAssignmentController.js'
import { validateAdminUserUpdate } from '../validators/auth.js'

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
 * locations, assignments, history, risk assessments, notifications, and
 * emergency contacts.
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

    // Fetch this user's emergency contacts (admin-only view; no secrets exposed)
    const emergencyContacts = await EmergencyContact.find({ userId: user._id }).sort({ createdAt: -1 })

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
        emergencyContacts: emergencyContacts.map(toSafeContact),
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/users/:id — internal helper to count admins. */
async function countAdmins(): Promise<number> {
  return User.countDocuments({ role: UserRole.ADMIN, isActive: true })
}

/** Log an admin action. */
async function logAdminAction(
  req: Request,
  adminId: string,
  action: string,
  targetId: string,
  targetType: string,
  details: string,
): Promise<void> {
  await AdminLog.create({
    adminId,
    action,
    targetType,
    targetId,
    details,
    ...(req.ip ? { ipAddress: req.ip } : {}),
  })
}

/**
 * PATCH /api/admin/users/:id — update a user account (admin only).
 * Allows updating name, email, phone, language, role, isActive.
 * Validates uniqueness, prevents self-demotion, protects last admin.
 */
export async function updateUserAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.auth?.userId
    if (!adminId) {
      next(unauthorized('Authentication required.'))
      return
    }

    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid user id.', [{ field: 'id', message: 'Must be a valid ObjectId.' }]))
      return
    }

    const { input, issues } = validateAdminUserUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid user data.', issues))
      return
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      next(notFoundError('User not found.'))
      return
    }

    // Prevent self-demotion / self-deactivation
    if (adminId === id) {
      if (input.role !== undefined && input.role !== UserRole.ADMIN) {
        next(badRequest('You cannot change your own admin role.'))
        return
      }
      if (input.isActive === false) {
        next(badRequest('You cannot deactivate your own administrator account.'))
        return
      }
    }

    // Protect last active admin
    if (input.role !== undefined && targetUser.role === UserRole.ADMIN && input.role !== UserRole.ADMIN) {
      const activeAdminCount = await countAdmins()
      if (activeAdminCount <= 1) {
        next(badRequest('Cannot demote the last active administrator.'))
        return
      }
    }
    if (input.isActive === false && targetUser.role === UserRole.ADMIN) {
      const activeAdminCount = await countAdmins()
      if (activeAdminCount <= 1) {
        next(badRequest('Cannot deactivate the last active administrator.'))
        return
      }
    }

    // Check unique constraints for email/phone
    if (input.email !== undefined && input.email !== targetUser.email) {
      const taken = await User.findOne({ email: input.email, _id: { $ne: targetUser._id } }).lean()
      if (taken) {
        next(conflict('An account with this email already exists.'))
        return
      }
      targetUser.email = input.email
    }
    if (input.phone !== undefined && input.phone !== targetUser.phone) {
      const taken = await User.findOne({ phone: input.phone, _id: { $ne: targetUser._id } }).lean()
      if (taken) {
        next(conflict('An account with this phone number already exists.'))
        return
      }
      targetUser.phone = input.phone
    }

    if (input.name !== undefined) targetUser.name = input.name
    if (input.language !== undefined) targetUser.language = input.language
    if (input.role !== undefined) targetUser.role = input.role as UserRole
    if (input.isActive !== undefined) targetUser.isActive = input.isActive

    await targetUser.save()

    await logAdminAction(
      req,
      adminId,
      'user.update',
      id,
      'Users',
      `Updated fields: ${Object.keys(input).join(', ')}`,
    )

    res.json({ success: true, data: { user: toSafeUser(targetUser) } })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/users/:id — permanently delete a user account (admin only).
 *
 * This is a real deletion, not deactivation. Only records directly owned by
 * the target user are removed:
 * - the user document
 * - the user's incidents and incident-linked updates, assignments, and notifications
 * - the user's emergency contacts and notifications linked to those contacts
 * - unsafe-area reports submitted by the user
 * - generated reports created by the user
 * - risk assessments and locations used exclusively by the removed records
 *
 * Global facilities, rescue teams, other users, and unrelated records are
 * preserved. A member reference to the deleted user is removed from rescue
 * teams without deleting the teams themselves. Prevents self-deletion and
 * deletion of the last active administrator.
 */
export async function deleteUserAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.auth?.userId
    if (!adminId) {
      next(unauthorized('Authentication required.'))
      return
    }

    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid user id.', [{ field: 'id', message: 'Must be a valid ObjectId.' }]))
      return
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      next(notFoundError('User not found.'))
      return
    }

    // Prevent self-deletion
    if (adminId === id) {
      next(badRequest('You cannot delete your own administrator account.'))
      return
    }

    // Protect last active admin
    if (targetUser.role === UserRole.ADMIN && targetUser.isActive) {
      const activeAdminCount = await countAdmins()
      if (activeAdminCount <= 1) {
        next(badRequest('Cannot delete the last active administrator.'))
        return
      }
    }

    const normalizeIds = (values: unknown[]): string[] => {
      const ids = new Set<string>()
      for (const value of values) {
        if (typeof value === 'string' && value !== '') {
          ids.add(value)
        } else if (value && typeof value === 'object') {
          ids.add(String(value))
        }
      }
      return [...ids]
    }

    const targetId = targetUser._id
    const [incidentIds, incidentLocationIds, contactIds, unsafeReportIds, unsafeLocationIds, generatedReportIds] =
      await Promise.all([
        Incident.distinct('_id', { userId: targetId }).then(normalizeIds),
        Incident.distinct('locationId', { userId: targetId, locationId: { $exists: true, $ne: null } }).then(
          normalizeIds,
        ),
        EmergencyContact.distinct('_id', { userId: targetId }).then(normalizeIds),
        UnsafeAreaReport.distinct('_id', { reportedBy: targetId }).then(normalizeIds),
        UnsafeAreaReport.distinct('locationId', { reportedBy: targetId, locationId: { $exists: true, $ne: null } }).then(
          normalizeIds,
        ),
        Report.distinct('_id', { generatedBy: targetId }).then(normalizeIds),
      ])
    const candidateLocationIds = [...new Set([...incidentLocationIds, ...unsafeLocationIds])]

    if (incidentIds.length > 0) {
      await IncidentUpdate.deleteMany({ incidentId: { $in: incidentIds } })
      await RescueAssignment.deleteMany({ incidentId: { $in: incidentIds } })
      await Notification.deleteMany({ incidentId: { $in: incidentIds } })
    }
    if (contactIds.length > 0) {
      await Notification.deleteMany({ contactId: { $in: contactIds } })
      await EmergencyContact.deleteMany({ _id: { $in: contactIds } })
    }
    const [incidentResult, unsafeResult, generatedResult] = await Promise.all([
      Incident.deleteMany({ userId: targetId }),
      UnsafeAreaReport.deleteMany({ reportedBy: targetId }),
      generatedReportIds.length > 0 ? Report.deleteMany({ _id: { $in: generatedReportIds } }) : Promise.resolve({ deletedCount: 0 }),
    ])
    const teamUnlinkResult = await RescueTeam.updateMany({ members: targetId }, { $pull: { members: targetId } })
    const deletedUser = await User.findOneAndDelete({ _id: targetId })
    if (!deletedUser) {
      next(notFoundError('User not found.'))
      return
    }

    let riskRemoved = 0
    let locationsRemoved = 0
    if (candidateLocationIds.length > 0) {
      const [incidentLocationRefs, unsafeLocationRefs, facilityLocationRefs, teamLocationRefs] = await Promise.all([
        Incident.distinct('locationId', { locationId: { $in: candidateLocationIds } }),
        UnsafeAreaReport.distinct('locationId', { locationId: { $in: candidateLocationIds } }),
        Facility.distinct('locationId', { locationId: { $in: candidateLocationIds } }),
        RescueTeam.distinct('locationId', { locationId: { $in: candidateLocationIds } }),
      ])
      const retained = new Set([...incidentLocationRefs, ...unsafeLocationRefs, ...facilityLocationRefs, ...teamLocationRefs].map(String))
      const orphanedLocationIds = candidateLocationIds.filter((locationId) => !retained.has(locationId))
      if (orphanedLocationIds.length > 0) {
        const riskResult = await RiskAssessment.deleteMany({ locationId: { $in: orphanedLocationIds } })
        const locationResult = await Location.deleteMany({ _id: { $in: orphanedLocationIds } })
        riskRemoved = riskResult.deletedCount ?? 0
        locationsRemoved = locationResult.deletedCount ?? 0
      }
    }

    const removed = {
      incidents: incidentResult.deletedCount ?? 0,
      unsafeReports: unsafeResult.deletedCount ?? 0,
      emergencyContacts: contactIds.length,
      generatedReports: generatedResult.deletedCount ?? 0,
      riskAssessments: riskRemoved,
      locations: locationsRemoved,
    }
    const unlinkedTeams = teamUnlinkResult.modifiedCount ?? 0

    await logAdminAction(
      req,
      adminId,
      'user.delete',
      id,
      'Users',
      `Permanently deleted user role=${targetUser.role}; removed ${removed.incidents} incidents, ${removed.unsafeReports} unsafe reports, ${removed.emergencyContacts} emergency contacts, ${removed.generatedReports} generated reports, ${removed.riskAssessments} risk assessments, ${removed.locations} locations; unlinked ${unlinkedTeams} rescue teams.`,
    )

    res.json({
      success: true,
      data: { deleted: true, id, removed, unlinkedTeams },
    })
  } catch (err) {
    next(err)
  }
}
