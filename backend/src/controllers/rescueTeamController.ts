import type { NextFunction, Request, Response } from 'express'
import { RescueTeam, type IRescueTeam } from '../models/RescueTeam.js'
import { badRequest, notFoundError, type HttpError } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'

export interface SafeRescueTeam {
  id: string
  name: string
  teamType: string
  phone: string
  email?: string
  isActive: boolean
  specializations: string[]
  createdAt: Date
  updatedAt: Date
}

export function toSafeTeam(doc: IRescueTeam): SafeRescueTeam {
  return {
    id: String(doc._id),
    name: doc.name,
    teamType: doc.teamType,
    phone: doc.phone,
    ...(doc.email ? { email: doc.email } : {}),
    isActive: doc.isActive,
    specializations: doc.specializations ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function buildTeamFilter(
  req: Request,
  activeOnly: boolean,
): { filter?: Record<string, unknown>; error?: HttpError } {
  const filter: Record<string, unknown> = {}
  if (activeOnly) filter.isActive = true

  if (req.query.teamType !== undefined) {
    const allowed = ['Police', 'Medical', 'Fire', 'Volunteer', 'NGO']
    if (typeof req.query.teamType !== 'string' || !allowed.includes(req.query.teamType)) {
      return { error: badRequest('Invalid teamType filter.', [{ field: 'teamType', message: `Type must be one of: ${allowed.join(', ')}.` }]) }
    }
    filter.teamType = req.query.teamType
  }
  if (typeof req.query.search === 'string' && req.query.search.trim() !== '') {
    filter.name = { $regex: escapeRegExp(req.query.search.trim().slice(0, 100)), $options: 'i' }
  }
  return { filter }
}

/**
 * GET /api/rescue-teams — teams visible to users: active teams only, with
 * optional type/search filters. Stored status shown honestly; nothing here
 * implies live physical availability.
 */
export async function listTeamsUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filter, error } = buildTeamFilter(req, true)
    if (error !== undefined || filter === undefined) {
      next(error ?? badRequest('Invalid filters.'))
      return
    }
    const docs = await RescueTeam.find(filter).sort({ name: 1 })
    res.json({ success: true, data: { teams: docs.map(toSafeTeam) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rescue-teams/:id — a single active team, or 404. */
export async function getTeamUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid team id.'))
      return
    }
    const doc = await RescueTeam.findOne({ _id: id, isActive: true })
    if (!doc) {
      next(notFoundError('Rescue team not found.'))
      return
    }
    res.json({ success: true, data: { team: toSafeTeam(doc) } })
  } catch (err) {
    next(err)
  }
}
