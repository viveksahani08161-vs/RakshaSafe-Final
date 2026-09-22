import type { NextFunction, Request, Response } from 'express'
import { AdminLog } from '../models/AdminLog.js'
import { Report, ReportFormat } from '../models/Report.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { toCsv, toPdf } from '../utils/export.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { buildSnapshot, defaultTitle, validateReportRequest } from '../services/reports.js'

const MAX_LIMIT = 50

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

function fileExtension(format: ReportFormat): string {
  switch (format) {
    case ReportFormat.PDF:
      return 'pdf'
    case ReportFormat.CSV:
      return 'csv'
    case ReportFormat.JSON:
      return 'json'
  }
}

/**
 * POST /api/admin/reports — aggregate live data into a structured snapshot
 * and store it as a Reports record. The snapshot is the report: exports
 * render from this stored data so downloads always match the display.
 */
export async function generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { reportType, format, title, filters, issues } = validateReportRequest(req.body)
    if (!reportType || !format || issues) {
      next(badRequest('Invalid report request.', issues))
      return
    }

    const snapshot = await buildSnapshot(reportType, filters ?? {})
    const doc = await Report.create({
      generatedBy: adminId,
      title: title ?? defaultTitle(reportType),
      reportType,
      filters: filters ?? {},
      dataSnapshot: snapshot,
      format: format as ReportFormat,
    })
    await AdminLog.create({
      adminId,
      action: 'report.generate',
      targetType: 'Reports',
      targetId: doc._id,
      details: `${reportType} (${format})`,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })

    res.status(201).json({
      success: true,
      data: {
        report: {
          id: String(doc._id),
          title: doc.title,
          reportType: doc.reportType,
          filters: doc.filters ?? {},
          format: doc.format,
          createdAt: doc.createdAt,
          dataSnapshot: doc.dataSnapshot ?? {},
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/reports — generated reports, newest first (no snapshots in list). */
export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Report.find().select('-dataSnapshot').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(),
    ])
    res.json({
      success: true,
      data: {
        reports: docs.map((d) => ({
          id: String(d._id),
          title: d.title,
          reportType: d.reportType,
          filters: d.filters ?? {},
          format: d.format,
          createdAt: d.createdAt,
          ...(d.expiresAt ? { expiresAt: d.expiresAt } : {}),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/admin/reports/:id — full record including the data snapshot. */
export async function getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const doc = await Report.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }
    res.json({
      success: true,
      data: {
        report: {
          id: String(doc._id),
          title: doc.title,
          reportType: doc.reportType,
          filters: doc.filters ?? {},
          format: doc.format,
          createdAt: doc.createdAt,
          ...(doc.expiresAt ? { expiresAt: doc.expiresAt } : {}),
          dataSnapshot: doc.dataSnapshot ?? {},
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/reports/:id/export — download the stored snapshot in the
 * record's own format. Nothing is re-aggregated, so the file always matches
 * the displayed report. Same authorization as the report itself.
 */
export async function exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const doc = await Report.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }

    const snapshot = (doc.dataSnapshot ?? {}) as Record<string, unknown>
    const filename = `rakshasafe-${doc.reportType}-${String(doc._id).slice(0, 8)}.${fileExtension(doc.format)}`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    if (doc.format === ReportFormat.JSON) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.send(JSON.stringify({ title: doc.title, reportType: doc.reportType, format: doc.format, createdAt: doc.createdAt, dataSnapshot: snapshot }, null, 2))
      return
    }
    if (doc.format === ReportFormat.CSV) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.send(toCsv(doc.title, snapshot))
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.send(toPdf(doc.title, snapshot))
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/reports/:id — permanently delete a generated report record.
 * Only the Reports document is removed; the snapshot lives inside that
 * document, and the source records aggregated into it (incidents, users,
 * facilities, …) are never touched — nothing else references a report.
 * Logged for accountability.
 */
export async function deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid report id.'))
      return
    }
    const doc = await Report.findById(id)
    if (!doc) {
      next(notFoundError('Report not found.'))
      return
    }
    const reportType = doc.reportType
    const reportFormat = doc.format
    await doc.deleteOne()
    await AdminLog.create({
      adminId,
      action: 'report.delete',
      targetType: 'Reports',
      targetId: doc._id,
      details: `${reportType} (${reportFormat})`,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })
    res.json({ success: true, data: { deleted: true } })
  } catch (err) {
    next(err)
  }
}
