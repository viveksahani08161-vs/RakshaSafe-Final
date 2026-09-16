import type { NextFunction, Request, Response } from 'express'
import { Facility, type IFacility } from '../models/Facility.js'
import { Location } from '../models/Location.js'
import { badRequest, notFoundError, type HttpError } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { toSafeLocation, type SafeLocation } from './incidentController.js'

export interface SafeFacility {
  id: string
  name: string
  facilityType: string
  locationId: string
  location: SafeLocation | null
  phone: string
  capacity?: number
  isOperational: boolean
  operatingHours?: string
  createdAt: Date
  updatedAt: Date
}

export function toSafeFacilityBase(doc: IFacility): Omit<SafeFacility, 'location'> {
  return {
    id: String(doc._id),
    name: doc.name,
    facilityType: doc.facilityType,
    locationId: String(doc.locationId),
    phone: doc.phone,
    ...(doc.capacity !== undefined ? { capacity: doc.capacity } : {}),
    isOperational: doc.isOperational,
    ...(doc.operatingHours ? { operatingHours: doc.operatingHours } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/** Batch-attach location records to avoid per-row queries. */
export async function withLocations(docs: IFacility[]): Promise<SafeFacility[]> {
  const ids = [...new Set(docs.map((d) => String(d.locationId)))]
  const locs = ids.length > 0 ? await Location.find({ _id: { $in: ids } }) : []
  const map = new Map(locs.map((l) => [String(l._id), toSafeLocation(l)]))
  return docs.map((d) => ({ ...toSafeFacilityBase(d), location: map.get(String(d.locationId)) ?? null }))
}

export async function withLocation(doc: IFacility): Promise<SafeFacility> {
  const [one] = await withLocations([doc])
  return one
}

/**
 * GET /api/facilities — resources visible to users: operational facilities
 * only, with optional type/search filters. Stored status shown honestly;
 * nothing here implies live availability.
 */
export async function listFacilitiesUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filter, error } = buildFacilityFilter(req, true)
    if (error !== undefined || filter === undefined) {
      next(error ?? badRequest('Invalid filters.'))
      return
    }
    const docs = await Facility.find(filter).sort({ name: 1 })
    res.json({ success: true, data: { facilities: await withLocations(docs) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/facilities/:id — a single operational facility, or 404. */
export async function getFacilityUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid facility id.'))
      return
    }
    const doc = await Facility.findOne({ _id: id, isOperational: true })
    if (!doc) {
      next(notFoundError('Facility not found.'))
      return
    }
    res.json({ success: true, data: { facility: await withLocation(doc) } })
  } catch (err) {
    next(err)
  }
}

export function buildFacilityFilter(
  req: Request,
  operationalOnly: boolean,
): { filter?: Record<string, unknown>; error?: HttpError } {
  const filter: Record<string, unknown> = {}
  if (operationalOnly) filter.isOperational = true

  if (req.query.facilityType !== undefined) {
    const allowed = ['Hospital', 'Shelter', 'Police Station', 'Fire Station', 'Relief Centre']
    if (typeof req.query.facilityType !== 'string' || !allowed.includes(req.query.facilityType)) {
      return { error: badRequest('Invalid facilityType filter.', [{ field: 'facilityType', message: `Type must be one of: ${allowed.join(', ')}.` }]) }
    }
    filter.facilityType = req.query.facilityType
  }
  if (typeof req.query.search === 'string' && req.query.search.trim() !== '') {
    filter.name = { $regex: escapeRegExp(req.query.search.trim().slice(0, 100)), $options: 'i' }
  }
  return { filter }
}
