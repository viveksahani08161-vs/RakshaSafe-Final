import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { User } from '../models/User.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { escapeRegExp } from '../utils/search.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateVerifyUpdate } from '../validators/unsafeReport.js'
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
 * PATCH /api/admin/unsafe-reports/:id — verify or unverify a report.
 * The only documented review action; logged for accountability.
 */
export async function verifyUnsafeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const { isVerified, issues } = validateVerifyUpdate(req.body)
    if (isVerified === undefined || issues) {
      next(badRequest('Invalid verification data.', issues))
      return
    }

    const doc = await UnsafeAreaReport.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }
    doc.isVerified = isVerified
    await doc.save()
    await AdminLog.create({
      adminId,
      action: isVerified ? 'unsafereport.verify' : 'unsafereport.unverify',
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
