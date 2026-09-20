import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Location } from '../models/Location.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { User, UserRole } from '../models/User.js'
import { badRequest, conflict, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateRescueTeamCreate, validateRescueTeamUpdate } from '../validators/rescueTeam.js'
import { buildTeamFilter, withTeamLocation, withTeamLocations } from './rescueTeamController.js'

const MAX_LIMIT = 50

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

/**
 * Resolve an optional team location the same way facilities do: an inline
 * `location` creates a Locations record, a `locationId` references an
 * existing one. Absent entirely means "no location" — never fabricated.
 */
async function resolveLocationId(
  locationId: string | undefined,
  location:
    | {
        latitude: number
        longitude: number
        address?: string
        city?: string
        state?: string
        country?: string
        accuracy?: number
      }
    | undefined,
): Promise<{ locationId?: string; issue?: { field: string; message: string } }> {
  if (location) {
    const created = await Location.create(location)
    return { locationId: String(created._id) }
  }
  if (locationId) {
    const exists = await Location.findById(locationId).select('_id').lean()
    if (!exists) return { issue: { field: 'locationId', message: 'Location not found.' } }
    return { locationId }
  }
  return {}
}

async function logAdmin(req: Request, adminId: string, action: string, targetId: string, details: string): Promise<void> {
  await AdminLog.create({
    adminId,
    action,
    targetType: 'RescueTeams',
    targetId,
    details,
    ...(req.ip ? { ipAddress: req.ip } : {}),
  })
}

/** POST /api/admin/rescue-teams */
export async function createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { input, issues } = validateRescueTeamCreate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid team data.', issues))
      return
    }

    const resolved = await resolveLocationId(input.locationId, input.location)
    if (resolved.issue) {
      next(badRequest('Invalid team data.', [resolved.issue]))
      return
    }

    const doc = await RescueTeam.create({
      name: input.name,
      teamType: input.teamType,
      phone: input.phone,
      ...(input.email ? { email: input.email } : {}),
      isActive: input.isActive,
      ...(input.specializations ? { specializations: input.specializations } : {}),
      ...(resolved.locationId ? { locationId: resolved.locationId } : {}),
    })
    await logAdmin(req, adminId, 'rescueteam.create', String(doc._id), `${doc.teamType}: ${doc.name}`)

    res.status(201).json({ success: true, data: { team: await withTeamLocation(doc) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/rescue-teams — all teams with type/status/search filters. */
export async function listTeamsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const { filter, error } = buildTeamFilter(req, false)
    if (error !== undefined || filter === undefined) {
      next(error ?? badRequest('Invalid filters.'))
      return
    }
    if (req.query.isActive !== undefined) {
      if (req.query.isActive !== 'true' && req.query.isActive !== 'false') {
        next(badRequest('Invalid isActive filter.', [{ field: 'isActive', message: 'Must be true or false.' }]))
        return
      }
      filter.isActive = req.query.isActive === 'true'
    }

    const [docs, total] = await Promise.all([
      RescueTeam.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      RescueTeam.countDocuments(filter),
    ])
    res.json({
      success: true,
      data: {
        teams: await withTeamLocations(docs),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/rescue-teams/:id */
export async function getTeamAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid team id.'))
      return
    }
    const doc = await RescueTeam.findById(id)
    if (!doc) {
      next(notFoundError('Rescue team not found.'))
      return
    }
    res.json({ success: true, data: { team: await withTeamLocation(doc) } })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/rescue-teams/:id — edit fields or activate/deactivate
 * via isActive. No hard delete (not documented).
 */
export async function updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid team id.'))
      return
    }
    const { input, issues } = validateRescueTeamUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid team data.', issues))
      return
    }

    const doc = await RescueTeam.findById(id)
    if (!doc) {
      next(notFoundError('Rescue team not found.'))
      return
    }

    if (input.name !== undefined) doc.name = input.name
    if (input.teamType !== undefined) doc.teamType = input.teamType
    if (input.phone !== undefined) doc.phone = input.phone
    if ('email' in input) doc.email = input.email
    if (input.isActive !== undefined) doc.isActive = input.isActive
    if (input.specializations !== undefined) doc.specializations = input.specializations
    if (input.locationId !== undefined || input.location !== undefined) {
      const resolved = await resolveLocationId(input.locationId, input.location)
      if (resolved.issue ?? !resolved.locationId) {
        next(badRequest('Invalid team data.', [resolved.issue ?? { field: 'location', message: 'A valid location is required.' }]))
        return
      }
      doc.set('locationId', resolved.locationId)
    }
    await doc.save()
    await logAdmin(req, adminId, 'rescueteam.update', String(doc._id), doc.name)

    res.json({ success: true, data: { team: await withTeamLocation(doc) } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/rescue-teams/:id/members — responder accounts linked to a
 * team. Membership is what authorizes the responder workflow: only members
 * see the team's assignments.
 */
export async function getTeamMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid team id.'))
      return
    }
    const doc = await RescueTeam.findById(id).select('_id members')
    if (!doc) {
      next(notFoundError('Rescue team not found.'))
      return
    }
    const users = await User.find({ _id: { $in: doc.members } }).select('name email phone role')
    res.json({
      success: true,
      data: {
        members: users.map((u) => ({
          id: String(u._id),
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/rescue-teams/:id/members — link a RESPONDER account to a
 * team. Only RESPONDER accounts can be members; USER accounts stay
 * end-users and ADMIN accounts already have full access.
 */
export async function addTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid team id.'))
      return
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    if (typeof body.userId !== 'string' || !isValidObjectId(body.userId)) {
      next(badRequest('Invalid member data.', [{ field: 'userId', message: 'A valid user id is required.' }]))
      return
    }

    const [team, user] = await Promise.all([
      RescueTeam.findById(id),
      User.findById(body.userId).select('_id role name email'),
    ])
    if (!team) {
      next(notFoundError('Rescue team not found.'))
      return
    }
    if (!user) {
      next(badRequest('Invalid member data.', [{ field: 'userId', message: 'User not found.' }]))
      return
    }
    if (user.role !== UserRole.RESPONDER) {
      next(
        badRequest('Invalid member data.', [
          { field: 'userId', message: 'Only RESPONDER accounts can be team members.' },
        ]),
      )
      return
    }
    if (team.members.some((m) => String(m) === String(user._id))) {
      next(conflict('This user is already a member of the team.'))
      return
    }

    team.members.push(user._id)
    await team.save()
    await logAdmin(req, adminId, 'rescueteam.member.add', String(team._id), `${team.name} <- ${user.email}`)

    res.status(201).json({ success: true, data: { team: await withTeamLocation(team) } })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/rescue-teams/:id/members/:userId — unlink a member.
 * Existing assignments stay untouched (history is never rewritten).
 */
export async function removeTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id, userId } = req.params
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      next(badRequest('Invalid team or user id.'))
      return
    }
    const team = await RescueTeam.findById(id)
    if (!team) {
      next(notFoundError('Rescue team not found.'))
      return
    }
    const before = team.members.length
    team.members = team.members.filter((m) => String(m) !== userId)
    if (team.members.length === before) {
      next(notFoundError('Team member not found.'))
      return
    }
    await team.save()
    await logAdmin(req, adminId, 'rescueteam.member.remove', String(team._id), `removed ${userId}`)

    res.json({ success: true, data: { team: await withTeamLocation(team) } })
  } catch (err) {
    next(err)
  }
}
