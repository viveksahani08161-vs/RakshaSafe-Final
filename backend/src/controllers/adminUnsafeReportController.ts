import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Location } from '../models/Location.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { User } from '../models/User.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateUnsafeReportAdminUpdate } from '../validators/unsafeReport.js'
import { toSafeUser } from './authController.js'
import { withReportLocations } from './unsafeReportController.js'

const MAX_LIMIT = 50

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

/** GET /api/admin/unsafe-reports — paginated, with verification/search filters. */
export async function listUnsafeReportsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = {}

    if (req.query.isVerified !== undefined) {
      if (req.query.isVerified !== 'true' && req.query.isVerified !== 'false') {
        next(badRequest('Invalid isVerified filter.', [{ field: 'isVerified', message: 'Must be true or false.' }]))
        return
      }
      filter.isVerified = req.query.isVerified === 'true'
    }
    if (typeof req.query.search === 'string' && req.query.search.trim() !== '') {
      const q = escapeRegExp(req.query.search.trim().slice(0, 100))
      filter.$or = [{ category: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }]
    }

    const [docs, total] = await Promise.all([
      UnsafeAreaReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UnsafeAreaReport.countDocuments(filter),
    ])
    res.json({
      success: true,
      data: {
        reports: await withReportLocations(docs),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/unsafe-reports/:id — report with reporter and location. */
export async function getUnsafeReportAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const doc = await UnsafeAreaReport.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }
    const [reporter, [report]] = await Promise.all([
      User.findById(doc.reportedBy).select('-passwordHash'),
      withReportLocations([doc]),
    ])
    res.json({
      success: true,
      data: { report, reporter: reporter ? toSafeUser(reporter) : null },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/unsafe-reports/:id — update report fields and/or review state.
 * A verification-only payload preserves the established verify/unverify
 * behavior; category, description, severity, review state, and replacement
 * stored coordinates may also be updated. All changes are logged.
 */
export async function verifyUnsafeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const { input, issues } = validateUnsafeReportAdminUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid report data.', issues))
      return
    }

    const doc = await UnsafeAreaReport.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }

    if (input.category !== undefined) doc.category = input.category
    if (input.description !== undefined) doc.description = input.description
    if (input.severity !== undefined) doc.severity = input.severity
    if (input.locationId !== undefined || input.location !== undefined) {
      if (input.locationId) {
        const exists = await Location.findById(input.locationId).select('_id').lean()
        if (!exists) {
          next(badRequest('Invalid report data.', [{ field: 'locationId', message: 'Location not found.' }]))
          return
        }
        doc.locationId = input.locationId as unknown as typeof doc.locationId
      } else if (input.location) {
        const created = await Location.create(input.location)
        doc.locationId = created._id
      }
    }
    if (input.isVerified !== undefined) doc.isVerified = input.isVerified
    await doc.save()

    const contentChanged =
      input.category !== undefined ||
      input.description !== undefined ||
      input.severity !== undefined ||
      input.locationId !== undefined ||
      input.location !== undefined
    const action =
      contentChanged && input.isVerified === undefined
        ? 'unsafereport.update'
        : contentChanged
          ? `unsafereport.update${input.isVerified ? '.verify' : '.unverify'}`
          : input.isVerified
            ? 'unsafereport.verify'
            : 'unsafereport.unverify'
    await AdminLog.create({
      adminId,
      action,
      targetType: 'UnsafeAreaReports',
      targetId: doc._id,
      details: `${doc.category} (${doc.severity})`,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })

    const [report] = await withReportLocations([doc])
    res.json({ success: true, data: { report } })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/unsafe-reports/:id — delete an unsafe-area report.
 * Only deletes the report document; the associated Location record is preserved
 * if it may be referenced elsewhere (conservative approach).
 * Logged for accountability.
 */
export async function deleteUnsafeReportAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const doc = await UnsafeAreaReport.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }
    const locationId = String(doc.locationId)
    const category = doc.category
    const severity = doc.severity
    await doc.deleteOne()
    await AdminLog.create({
      adminId,
      action: 'unsafereport.delete',
      targetType: 'UnsafeAreaReports',
      targetId: doc._id,
      details: `${category} (${severity})`,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })
    // Note: Location record is intentionally preserved to avoid orphaning
    // any other references. Admin can clean up Locations separately if needed.
    res.json({ success: true, data: { deleted: true, locationId } })
  } catch (err) {
    next(err)
  }
}
