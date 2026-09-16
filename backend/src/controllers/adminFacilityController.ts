import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Facility } from '../models/Facility.js'
import { Location } from '../models/Location.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateFacilityCreate, validateFacilityUpdate } from '../validators/facility.js'
import { buildFacilityFilter, withLocation, withLocations } from './facilityController.js'

const MAX_LIMIT = 50

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

async function resolveLocationId(
  locationId: string | undefined,
  location: { latitude: number; longitude: number; address?: string; city?: string; state?: string; country?: string; accuracy?: number } | undefined,
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
    targetType: 'Facilities',
    targetId,
    details,
    ...(req.ip ? { ipAddress: req.ip } : {}),
  })
}

/** POST /api/admin/facilities — create with inline coordinates or an existing locationId. */
export async function createFacility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { input, issues } = validateFacilityCreate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid facility data.', issues))
      return
    }

    const resolved = await resolveLocationId(input.locationId, input.location)
    if (resolved.issue ?? !resolved.locationId) {
      next(badRequest('Invalid facility data.', [resolved.issue ?? { field: 'location', message: 'A location is required.' }]))
      return
    }

    const doc = await Facility.create({
      name: input.name,
      facilityType: input.facilityType,
      locationId: resolved.locationId,
      phone: input.phone,
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      isOperational: input.isOperational,
      ...(input.operatingHours ? { operatingHours: input.operatingHours } : {}),
    })
    await logAdmin(req, adminId, 'facility.create', String(doc._id), `${doc.facilityType}: ${doc.name}`)

    res.status(201).json({ success: true, data: { facility: await withLocation(doc) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/facilities — all facilities with type/status/search filters. */
export async function listFacilitiesAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const { filter, error } = buildFacilityFilter(req, false)
    if (error !== undefined || filter === undefined) {
      next(error ?? badRequest('Invalid filters.'))
      return
    }
    if (req.query.isOperational !== undefined) {
      if (req.query.isOperational !== 'true' && req.query.isOperational !== 'false') {
        next(badRequest('Invalid isOperational filter.', [{ field: 'isOperational', message: 'Must be true or false.' }]))
        return
      }
      filter.isOperational = req.query.isOperational === 'true'
    }

    const [docs, total] = await Promise.all([
      Facility.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Facility.countDocuments(filter),
    ])
    res.json({
      success: true,
      data: {
        facilities: await withLocations(docs),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/facilities/:id */
export async function getFacilityAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid facility id.'))
      return
    }
    const doc = await Facility.findById(id)
    if (!doc) {
      next(notFoundError('Facility not found.'))
      return
    }
    res.json({ success: true, data: { facility: await withLocation(doc) } })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/facilities/:id — edit fields, swap location, or
 * activate/deactivate via isOperational. No hard delete (not documented).
 */
export async function updateFacility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid facility id.'))
      return
    }
    const { input, issues } = validateFacilityUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid facility data.', issues))
      return
    }

    const doc = await Facility.findById(id)
    if (!doc) {
      next(notFoundError('Facility not found.'))
      return
    }

    if (input.name !== undefined) doc.name = input.name
    if (input.facilityType !== undefined) doc.facilityType = input.facilityType
    if (input.phone !== undefined) doc.phone = input.phone
    if (input.locationId !== undefined || input.location !== undefined) {
      const resolved = await resolveLocationId(input.locationId, input.location)
      if (resolved.issue ?? !resolved.locationId) {
        next(badRequest('Invalid facility data.', [resolved.issue ?? { field: 'location', message: 'A valid location is required.' }]))
        return
      }
      doc.set('locationId', resolved.locationId)
    }
    if (input.capacity !== undefined) doc.capacity = input.capacity ?? undefined
    if ('operatingHours' in input) doc.operatingHours = input.operatingHours
    if (input.isOperational !== undefined) doc.isOperational = input.isOperational
    await doc.save()
    await logAdmin(req, adminId, 'facility.update', String(doc._id), doc.name)

    res.json({ success: true, data: { facility: await withLocation(doc) } })
  } catch (err) {
    next(err)
  }
}
