import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateRescueTeamCreate, validateRescueTeamUpdate } from '../validators/rescueTeam.js'
import { buildTeamFilter, toSafeTeam } from './rescueTeamController.js'

const MAX_LIMIT = 50

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
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

    const doc = await RescueTeam.create(input)
    await logAdmin(req, adminId, 'rescueteam.create', String(doc._id), `${doc.teamType}: ${doc.name}`)

    res.status(201).json({ success: true, data: { team: toSafeTeam(doc) } })
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
        teams: docs.map(toSafeTeam),
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
    res.json({ success: true, data: { team: toSafeTeam(doc) } })
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
    await doc.save()
    await logAdmin(req, adminId, 'rescueteam.update', String(doc._id), doc.name)

    res.json({ success: true, data: { team: toSafeTeam(doc) } })
  } catch (err) {
    next(err)
  }
}
