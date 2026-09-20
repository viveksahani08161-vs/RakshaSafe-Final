import type { NextFunction, Request, Response } from 'express'
import { Location } from '../models/Location.js'
import { RescueTeam, type IRescueTeam } from '../models/RescueTeam.js'
import { badRequest, notFoundError, type HttpError } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { toSafeLocation, type SafeLocation } from './incidentController.js'

export interface SafeRescueTeam {
  id: string
  name: string
  teamType: string
  phone: string
  email?: string
  isActive: boolean
  specializations: string[]
  members: string[]
  locationId?: string
  location: SafeLocation | null
  createdAt: Date
  updatedAt: Date
}

export function toSafeTeamBase(doc: IRescueTeam): Omit<SafeRescueTeam, 'location'> {
  return {
    id: String(doc._id),
    name: doc.name,
    teamType: doc.teamType,
    phone: doc.phone,
    ...(doc.email ? { email: doc.email } : {}),
    isActive: doc.isActive,
    specializations: doc.specializations ?? [],
    members: (doc.members ?? []).map((m) => String(m)),
    ...(doc.locationId ? { locationId: String(doc.locationId) } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/** Backwards-compatible serializer: same fields as before, location null. */
export function toSafeTeam(doc: IRescueTeam): SafeRescueTeam {
  return { ...toSafeTeamBase(doc), location: null }
}

/** Batch-attach stored locations to avoid per-row queries. */
export async function withTeamLocations(docs: IRescueTeam[]): Promise<SafeRescueTeam[]> {
  const ids = [...new Set(docs.map((d) => (d.locationId ? String(d.locationId) : '')).filter((s) => s !== ''))]
  const locs = ids.length > 0 ? await Location.find({ _id: { $in: ids } }) : []
  const map = new Map(locs.map((l) => [String(l._id), toSafeLocation(l)]))
  return docs.map((d) => {
    const base = toSafeTeamBase(d)
    return {
      ...base,
      location: d.locationId ? (map.get(String(d.locationId)) ?? null) : null,
    }
  })
}

export async function withTeamLocation(doc: IRescueTeam): Promise<SafeRescueTeam> {
  const [one] = await withTeamLocations([doc])
  return one
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
    res.json({ success: true, data: { teams: await withTeamLocations(docs) } })
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
    res.json({ success: true, data: { team: await withTeamLocation(doc) } })
  } catch (err) {
    next(err)
  }
}
