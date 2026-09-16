import type mongoose from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { Facility } from '../models/Facility.js'
import { Incident, IncidentPriority, IncidentStatus, IncidentType } from '../models/Incident.js'
import { Notification } from '../models/Notification.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { RiskAssessment } from '../models/RiskAssessment.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import type { ValidationIssue } from '../validators/auth.js'

type AnyModel = mongoose.Model<any>;

/**
 * Documented report types, drawn from the analytics list (baseline §25):
 * incident counts/breakdowns/monthly buckets, resource counts, and the
 * safety overview (unsafe reports, risk distribution, notifications).
 */
export const REPORT_TYPES = ['incident-summary', 'resource-summary', 'safety-overview'] as const
export type ReportType = (typeof REPORT_TYPES)[number]

export interface ReportFilters {
  status?: string
  type?: string
  priority?: string
  month?: string
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function monthRangeUtc(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number)
  const start = new Date(Date.UTC(y, (m as number) - 1, 1))
  const end = new Date(Date.UTC(y, m as number, 1))
  return { start, end }
}

/** Last N UTC month buckets ending with the current month: ['YYYY-MM', ...]. */
function lastMonthsUtc(n: number): string[] {
  const now = new Date()
  const out: string[] = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export function validateReportRequest(
  body: unknown,
): { reportType?: ReportType; format?: string; title?: string; filters?: ReportFilters; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  let reportType: ReportType | undefined
  if (typeof b.reportType === 'string' && (REPORT_TYPES as readonly string[]).includes(b.reportType)) {
    reportType = b.reportType as ReportType
  } else {
    issues.push({ field: 'reportType', message: `Report type must be one of: ${REPORT_TYPES.join(', ')}.` })
  }

  let format: string | undefined
  if (b.format === 'PDF' || b.format === 'CSV' || b.format === 'JSON') {
    format = b.format
  } else {
    issues.push({ field: 'format', message: 'Format must be PDF, CSV or JSON.' })
  }

  let title: string | undefined
  if (b.title !== undefined) {
    const t = typeof b.title === 'string' ? b.title.trim() : ''
    if (t === '' || t.length > 150) {
      issues.push({ field: 'title', message: 'Title must be 1–150 characters.' })
    } else {
      title = t
    }
  }

  // Only whitelisted filters are accepted; anything else is rejected.
  const allowedByType: Record<ReportType, string[]> = {
    'incident-summary': ['status', 'type', 'priority', 'month'],
    'resource-summary': [],
    'safety-overview': [],
  }
  const filters: ReportFilters = {}
  const rawFilters = b.filters !== undefined ? (b.filters as Record<string, unknown>) : {}
  if (b.filters !== undefined && (typeof b.filters !== 'object' || b.filters === null || Array.isArray(b.filters))) {
    issues.push({ field: 'filters', message: 'Filters must be an object.' })
  } else if (reportType) {
    for (const key of Object.keys(rawFilters)) {
      if (!allowedByType[reportType].includes(key)) {
        issues.push({ field: `filters.${key}`, message: `Filter '${key}' is not supported for ${reportType}.` })
      }
    }
    if (rawFilters.status !== undefined) {
      const allowed = Object.values(IncidentStatus) as string[]
      if (typeof rawFilters.status !== 'string' || !allowed.includes(rawFilters.status)) {
        issues.push({ field: 'filters.status', message: `Status must be one of: ${allowed.join(', ')}.` })
      } else {
        filters.status = rawFilters.status
      }
    }
    if (rawFilters.type !== undefined) {
      const allowed = Object.values(IncidentType) as string[]
      if (typeof rawFilters.type !== 'string' || !allowed.includes(rawFilters.type)) {
        issues.push({ field: 'filters.type', message: 'Type must be Safety or Disaster.' })
      } else {
        filters.type = rawFilters.type
      }
    }
    if (rawFilters.priority !== undefined) {
      const allowed = Object.values(IncidentPriority) as string[]
      if (typeof rawFilters.priority !== 'string' || !allowed.includes(rawFilters.priority)) {
        issues.push({ field: 'filters.priority', message: `Priority must be one of: ${allowed.join(', ')}.` })
      } else {
        filters.priority = rawFilters.priority
      }
    }
    if (rawFilters.month !== undefined) {
      if (typeof rawFilters.month !== 'string' || !MONTH_RE.test(rawFilters.month)) {
        issues.push({ field: 'filters.month', message: 'Month must be YYYY-MM (UTC).' })
      } else {
        filters.month = rawFilters.month
      }
    }
  }

  if (issues.length > 0) return { issues }
  return { reportType, format, ...(title ? { title } : {}), filters }
}

async function countBy(
  model: AnyModel,
  match: Record<string, unknown>,
  field: string,
): Promise<Record<string, number>> {
  const pipeline: PipelineStage[] = []
  if (Object.keys(match).length > 0) pipeline.push({ $match: match })
  pipeline.push({ $group: { _id: `$${field}`, count: { $sum: 1 } } })
  const rows = (await model.aggregate(pipeline)) as { _id: unknown; count: number }[]
  const out: Record<string, number> = {}
  for (const row of rows) {
    if (typeof row._id === 'string') out[row._id] = row.count
  }
  return out
}

function incidentMatch(filters: ReportFilters): Record<string, unknown> {
  const match: Record<string, unknown> = {}
  if (filters.status) match.status = filters.status
  if (filters.type) match.type = filters.type
  if (filters.priority) match.priority = filters.priority
  if (filters.month) {
    const { start, end } = monthRangeUtc(filters.month)
    match.createdAt = { $gte: start, $lt: end }
  }
  return match
}

export async function buildIncidentSummary(filters: ReportFilters): Promise<Record<string, unknown>> {
  const match = incidentMatch(filters)
  const [byStatus, byPriority, byType, total, monthlyRows] = await Promise.all([
    countBy(Incident, match, 'status'),
    countBy(Incident, match, 'priority'),
    countBy(Incident, match, 'type'),
    Incident.countDocuments(match),
    Incident.aggregate([
      ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]) as Promise<{ _id: string; count: number }[]>,
  ])
  const monthly: Record<string, number> = {}
  for (const m of lastMonthsUtc(6)) monthly[m] = 0
  for (const row of monthlyRows) {
    if (typeof row._id === 'string' && row._id in monthly) monthly[row._id] = row.count
  }
  return { total, byStatus, byPriority, byType, monthlyLast6Utc: monthly }
}

export async function buildResourceSummary(): Promise<Record<string, unknown>> {
  const [facOp, facOff, facType, teamsOn, teamsOff, asgStatus, asgTotal] = await Promise.all([
    Facility.countDocuments({ isOperational: true }),
    Facility.countDocuments({ isOperational: false }),
    countBy(Facility, {}, 'facilityType'),
    RescueTeam.countDocuments({ isActive: true }),
    RescueTeam.countDocuments({ isActive: false }),
    countBy(RescueAssignment, {}, 'status'),
    RescueAssignment.countDocuments(),
  ])
  return {
    facilities: { total: facOp + facOff, operational: facOp, nonOperational: facOff, byType: facType },
    teams: { total: teamsOn + teamsOff, active: teamsOn, inactive: teamsOff },
    assignments: { total: asgTotal, byStatus: asgStatus },
  }
}

export async function buildSafetyOverview(): Promise<Record<string, unknown>> {
  const [repTotal, repVerified, repByCategory, riskByLevel, riskTotal, notifByStatus, notifByChannel, notifTotal] =
    await Promise.all([
      UnsafeAreaReport.countDocuments(),
      UnsafeAreaReport.countDocuments({ isVerified: true }),
      countBy(UnsafeAreaReport, {}, 'category'),
      countBy(RiskAssessment, {}, 'riskLevel'),
      RiskAssessment.countDocuments(),
      countBy(Notification, {}, 'status'),
      countBy(Notification, {}, 'channel'),
      Notification.countDocuments(),
    ])
  return {
    unsafeReports: { total: repTotal, verified: repVerified, unverified: repTotal - repVerified, byCategory: repByCategory },
    risk: { total: riskTotal, byLevel: riskByLevel },
    notifications: { total: notifTotal, byStatus: notifByStatus, byChannel: notifByChannel },
  }
}

export async function buildSnapshot(
  reportType: ReportType,
  filters: ReportFilters,
): Promise<Record<string, unknown>> {
  const generatedAt = new Date().toISOString()
  if (reportType === 'incident-summary') {
    return { generatedAtUtc: generatedAt, filters, incidents: await buildIncidentSummary(filters) }
  }
  if (reportType === 'resource-summary') {
    return { generatedAtUtc: generatedAt, filters, resources: await buildResourceSummary() }
  }
  return { generatedAtUtc: generatedAt, filters, safety: await buildSafetyOverview() }
}

export function defaultTitle(reportType: ReportType): string {
  const date = new Date().toISOString().slice(0, 10)
  const names: Record<ReportType, string> = {
    'incident-summary': 'Incident Summary',
    'resource-summary': 'Resource Summary',
    'safety-overview': 'Safety Overview',
  }
  return `${names[reportType]} — ${date} (UTC)`
}
