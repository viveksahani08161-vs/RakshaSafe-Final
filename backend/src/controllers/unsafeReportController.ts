import type { NextFunction, Request, Response } from 'express'
import { Location } from '../models/Location.js'
import { UnsafeAreaReport, type IUnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateUnsafeReportCreate } from '../validators/unsafeReport.js'
import { toSafeLocation, type SafeLocation } from './incidentController.js'

export interface SafeUnsafeReport {
  id: string
  category: string
  description: string
  severity: string
  isVerified: boolean
  locationId: string
  location: SafeLocation | null
  createdAt: Date
  updatedAt: Date
}

export function toSafeUnsafeReport(
  doc: IUnsafeAreaReport,
  location: SafeLocation | null,
): SafeUnsafeReport {
  return {
    id: String(doc._id),
    category: doc.category,
    description: doc.description,
    severity: doc.severity,
    isVerified: doc.isVerified,
    locationId: String(doc.locationId),
    location,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export async function withReportLocations(docs: IUnsafeAreaReport[]): Promise<SafeUnsafeReport[]> {
  const ids = [...new Set(docs.map((d) => String(d.locationId)))]
  const locs = ids.length > 0 ? await Location.find({ _id: { $in: ids } }) : []
  const map = new Map(locs.map((l) => [String(l._id), toSafeLocation(l)]))
  return docs.map((d) => toSafeUnsafeReport(d, map.get(String(d.locationId)) ?? null))
}

function requireOwnerId(req: Request): string {
  const userId = req.auth?.userId
  if (!userId) throw unauthorized('Authentication required.')
  return userId
}

/**
 * POST /api/unsafe-reports — report comes from the JWT owner, starts
 * unverified (user submissions are never auto-confirmed). A location is
 * mandatory: the schema requires locationId, so reports without one are
 * rejected rather than stored with false coordinates.
 */
export async function createUnsafeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { input, issues } = validateUnsafeReportCreate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid report data.', issues))
      return
    }

    let locationId = input.locationId
    if (input.location) {
      const created = await Location.create(input.location)
      locationId = String(created._id)
    } else if (locationId) {
      const exists = await Location.findById(locationId).select('_id').lean()
      if (!exists) {
        next(badRequest('Invalid report data.', [{ field: 'locationId', message: 'Location not found.' }]))
        return
      }
    }

    const doc = await UnsafeAreaReport.create({
      reportedBy: ownerId,
      locationId,
      category: input.category,
      description: input.description,
      severity: input.severity,
      isVerified: false,
    })
    const location = await Location.findById(doc.locationId)

    res.status(201).json({ success: true, data: { report: toSafeUnsafeReport(doc, location ? toSafeLocation(location) : null) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/unsafe-reports — the caller's own reports, newest first. */
export async function listUnsafeReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const docs = await UnsafeAreaReport.find({ reportedBy: ownerId }).sort({ createdAt: -1 })
    res.json({ success: true, data: { reports: await withReportLocations(docs) } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/unsafe-reports/:id — scoped lookup: another user's id yields 404.
 */
export async function getUnsafeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const doc = await UnsafeAreaReport.findOne({ _id: id, reportedBy: ownerId })
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }
    const location = await Location.findById(doc.locationId)
    res.json({
      success: true,
      data: { report: toSafeUnsafeReport(doc, location ? toSafeLocation(location) : null) },
    })
  } catch (err) {
    next(err)
  }
}
