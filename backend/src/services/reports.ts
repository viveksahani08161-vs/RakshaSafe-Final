import type mongoose from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { Facility } from '../models/Facility.js'
import { EmergencyContact } from '../models/EmergencyContact.js'
import { Incident, IncidentPriority, IncidentStatus, IncidentType } from '../models/Incident.js'
import { IncidentUpdate } from '../models/IncidentUpdate.js'
import { Location } from '../models/Location.js'
import { Notification } from '../models/Notification.js'
import { ReportCounter } from '../models/ReportCounter.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { RiskAssessment } from '../models/RiskAssessment.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { User } from '../models/User.js'
import { badRequest, notFoundError } from '../utils/errors.js'
import type { ValidationIssue } from '../validators/auth.js'

type AnyModel = mongoose.Model<any>;

/**
 * Documented report types, drawn from the analytics list (baseline §25):
 * incident counts/breakdowns/monthly buckets, resource counts, and the
 * safety overview (unsafe reports, risk distribution, notifications).
 */
export const REPORT_TYPES = [
  'incident-summary',
  'resource-summary',
  'safety-overview',
  'user-incident-summary',
  'incident-record',
  'unsafe-area-record',
] as const
export type ReportType = (typeof REPORT_TYPES)[number]

/** The three user-scoped types: every record in the snapshot belongs to one user. */
export const USER_SCOPED_TYPES: readonly ReportType[] = [
  'user-incident-summary',
  'incident-record',
  'unsafe-area-record',
]

export interface ReportFilters {
  status?: string
  type?: string
  priority?: string
  month?: string
  /** Subject user for user-scoped types. Never trusted alone — the builder
   * re-verifies ownership in its own queries (defense in depth). */
  userId?: string
  /** Single-record selectors; each is valid for exactly one report type. */
  incidentId?: string
  unsafeReportId?: string
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function isObjectIdString(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value)
}

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
    } else if (/[\r\n]/.test(t)) {
      issues.push({ field: 'title', message: 'Title must not contain line breaks.' })
    } else {
      title = t
    }
  }

  // Only whitelisted filters are accepted; anything else is rejected.
  const allowedByType: Record<ReportType, string[]> = {
    'incident-summary': ['status', 'type', 'priority', 'month'],
    'resource-summary': [],
    'safety-overview': [],
    'user-incident-summary': ['userId', 'status', 'type', 'priority', 'month'],
    'incident-record': ['userId', 'incidentId'],
    'unsafe-area-record': ['userId', 'unsafeReportId'],
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
    if (rawFilters.userId !== undefined) {
      if (typeof rawFilters.userId !== 'string' || !isObjectIdString(rawFilters.userId)) {
        issues.push({ field: 'filters.userId', message: 'User ID must be a valid user id.' })
      } else {
        filters.userId = rawFilters.userId
      }
    }
    if (rawFilters.incidentId !== undefined) {
      if (typeof rawFilters.incidentId !== 'string' || !isObjectIdString(rawFilters.incidentId)) {
        issues.push({ field: 'filters.incidentId', message: 'Incident ID must be a valid incident id.' })
      } else {
        filters.incidentId = rawFilters.incidentId
      }
    }
    if (rawFilters.unsafeReportId !== undefined) {
      if (typeof rawFilters.unsafeReportId !== 'string' || !isObjectIdString(rawFilters.unsafeReportId)) {
        issues.push({ field: 'filters.unsafeReportId', message: 'Report ID must be a valid unsafe-area report id.' })
      } else {
        filters.unsafeReportId = rawFilters.unsafeReportId
      }
    }
  }

  // User-scoped types always need their subject; single-record types always
  // need exactly their record — enforced here so the backend never builds a
  // scoped report from an incomplete selection.
  if (!issues.length && reportType && (USER_SCOPED_TYPES as readonly string[]).includes(reportType)) {
    if (!filters.userId) {
      issues.push({ field: 'filters.userId', message: 'A user must be selected for this report type.' })
    }
    if (reportType === 'incident-record' && !filters.incidentId) {
      issues.push({ field: 'filters.incidentId', message: 'An incident record must be selected for this report type.' })
    }
    if (reportType === 'unsafe-area-record' && !filters.unsafeReportId) {
      issues.push({ field: 'filters.unsafeReportId', message: 'An unsafe-area record must be selected for this report type.' })
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
  if (reportType === 'user-incident-summary') {
    return { generatedAtUtc: generatedAt, filters, ...(await buildUserIncidentSummary(filters)) }
  }
  if (reportType === 'incident-record') {
    return { generatedAtUtc: generatedAt, filters, ...(await buildIncidentRecord(filters)) }
  }
  if (reportType === 'unsafe-area-record') {
    return { generatedAtUtc: generatedAt, filters, ...(await buildUnsafeAreaRecord(filters)) }
  }
  return { generatedAtUtc: generatedAt, filters, safety: await buildSafetyOverview() }
}

/** Attach the report envelope (serial, type, generator) around a snapshot. */
export async function reportEnvelope(
  adminId: string,
  serialNo: string,
  reportType: ReportType,
): Promise<Record<string, unknown>> {
  const admin = await User.findById(adminId).select('name email').lean()
  return {
    serialNo,
    reportType,
    generatedBy: admin
      ? { id: String(admin._id), name: admin.name, email: admin.email }
      : { id: String(adminId) },
  }
}

export function defaultTitle(
  reportType: ReportType,
  opts: { recordId?: string; userName?: string } = {},
): string {
  const date = new Date().toISOString().slice(0, 10)
  const short = opts.recordId ? String(opts.recordId).slice(0, 8) : ''
  const names: Record<ReportType, string> = {
    'incident-summary': 'Incident Summary',
    'resource-summary': 'Resource Summary',
    'safety-overview': 'Safety Overview',
    'user-incident-summary': opts.userName ? `Incident Summary — ${opts.userName}` : 'User Incident Summary',
    'incident-record': short ? `Incident Report — ${short}` : 'Incident Report',
    'unsafe-area-record': short ? `Unsafe-Area Report — ${short}` : 'Unsafe-Area Report',
  }
  return `${names[reportType]} — ${date} (UTC)`
}

/**
 * Next report serial number (RPT-YYYY-NNNNNN), allocated atomically so
 * concurrent generations never share or reuse a number — even across
 * deleted reports, because the counter only moves forward.
 */
export async function nextReportSerial(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const doc = await ReportCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  return `RPT-${year}-${String(doc.seq).padStart(6, '0')}`
}

function safeUser(user: { _id: unknown; name: string; email: string; phone: string }): Record<string, unknown> {
  return { id: String(user._id), name: user.name, email: user.email, phone: user.phone }
}

/**
 * Display markers for fields the data model does not record. These strings
 * describe absence — they are never real data and must be rendered verbatim,
 * never replaced with invented values.
 */
const NOT_PROVIDED = 'Not provided'
const NOT_AVAILABLE = 'Not available'
const LIVE_UNAVAILABLE = 'Live location unavailable — stored coordinates only.'

function subjectUserBlock(
  user: { _id: unknown; name: string; email: string; phone: string },
  contacts: { _id: unknown; name: string; phone: string; email?: string; relationship?: string; isPrimary: boolean }[],
): Record<string, unknown> {
  return {
    ...safeUser(user),
    // The Users collection records no gender or registered address.
    gender: NOT_PROVIDED,
    registeredAddress: NOT_PROVIDED,
    emergencyContacts: contacts.map((c) => ({
      name: c.name,
      phone: c.phone,
      ...(c.email ? { email: c.email } : {}),
      ...(c.relationship ? { relationship: c.relationship } : {}),
      isPrimary: c.isPrimary,
    })),
  }
}

async function userContacts(userId: unknown): Promise<
  { _id: unknown; name: string; phone: string; email?: string; relationship?: string; isPrimary: boolean }[]
> {
  return EmergencyContact.find({ userId }).sort({ isPrimary: -1, createdAt: 1 }).lean()
}

/** Delivery statuses for one incident — channel/status/attempts only, never provider internals. */
async function incidentNotifications(incidentId: unknown): Promise<Record<string, unknown>[]> {
  const docs = await Notification.find({ incidentId }).sort({ createdAt: 1 }).lean()
  return docs.map((n) => ({
    channel: n.channel,
    status: n.status,
    attemptCount: n.attemptCount,
    ...(n.lastAttemptAt ? { lastAttemptAt: n.lastAttemptAt } : {}),
    createdAt: n.createdAt,
  }))
}

function safeLocation(loc: {
  _id: unknown
  latitude: number
  longitude: number
  address?: string
  city?: string
  district?: string
  state?: string
  country?: string
  accuracy?: number
  createdAt?: Date
} | null): Record<string, unknown> | null {
  if (!loc) return null
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    // Stored reverse-geocoded parts only; absent parts stay absent (never
    // geocoded on the fly here, never invented).
    ...(loc.address ? { address: loc.address } : { address: NOT_AVAILABLE }),
    ...(loc.city ? { city: loc.city } : {}),
    ...(loc.district ? { district: loc.district } : {}),
    ...(loc.state ? { state: loc.state } : {}),
    ...(loc.country ? { country: loc.country } : {}),
    ...(loc.accuracy !== undefined ? { accuracyMeters: loc.accuracy } : { accuracyMeters: NOT_AVAILABLE }),
    ...(loc.createdAt ? { capturedAt: loc.createdAt } : {}),
    // A stored record can never prove a live position.
    liveLocation: { available: false, note: LIVE_UNAVAILABLE },
  }
}

/**
 * Multi-record user report: every incident belongs to filters.userId —
 * enforced in the query itself, so no cross-user row can enter the payload.
 */
export async function buildUserIncidentSummary(filters: ReportFilters): Promise<Record<string, unknown>> {
  const user = await User.findById(filters.userId!).select('name email phone')
  if (!user) throw notFoundError('Selected user no longer exists.')
  const match: Record<string, unknown> = { userId: user._id, ...incidentMatch(filters) }
  const incidents = await Incident.find(match).sort({ createdAt: -1 })
  const locationIds = [...new Set(incidents.map((i) => String(i.locationId)).filter((s) => /^[0-9a-fA-F]{24}$/.test(s)))]
  const locs = locationIds.length > 0 ? await Location.find({ _id: { $in: locationIds } }) : []
  const locMap = new Map(locs.map((l) => [String(l._id), l]))
  const contacts = await userContacts(user._id)
  return {
    subjectUser: subjectUserBlock(user, contacts),
    incidents: incidents.map((i) => ({
      id: String(i._id),
      category: i.category,
      type: i.type,
      priority: i.priority,
      status: i.status,
      description: i.description,
      location: safeLocation(locMap.get(String(i.locationId)) ?? null),
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      ...(i.resolvedAt ? { resolvedAt: i.resolvedAt } : { resolvedAt: NOT_AVAILABLE }),
    })),
  }
}

/**
 * Single-incident report. Ownership is part of the lookup: a record owned
 * by someone else yields an explicit mismatch error, never their data.
 */
export async function buildIncidentRecord(filters: ReportFilters): Promise<Record<string, unknown>> {
  const user = await User.findById(filters.userId!).select('name email phone')
  if (!user) throw notFoundError('Selected user no longer exists.')
  const incident = await Incident.findOne({ _id: filters.incidentId!, userId: user._id })
  if (!incident) {
    const exists = await Incident.findById(filters.incidentId!).select('_id')
    if (exists) throw badRequest('Selected incident does not belong to the selected user.')
    throw notFoundError('Selected incident no longer exists.')
  }
  const [location, assignments, updates, risks, notifications, contacts] = await Promise.all([
    incident.locationId ? Location.findById(incident.locationId) : null,
    RescueAssignment.find({ incidentId: incident._id }).sort({ createdAt: -1 }),
    IncidentUpdate.find({ incidentId: incident._id }).sort({ createdAt: 1 }),
    RiskAssessment.find({ locationId: incident.locationId }).sort({ assessedAt: -1 }),
    incidentNotifications(incident._id),
    userContacts(user._id),
  ])
  const teamIds = [...new Set(assignments.map((a) => String(a.teamId)))]
  const teams = teamIds.length > 0
    ? await RescueTeam.find({ _id: { $in: teamIds } }).select('name teamType phone')
    : []
  const teamMap = new Map(teams.map((t) => [String(t._id), t]))
  return {
    subjectUser: subjectUserBlock(user, contacts),
    record: {
      id: String(incident._id),
      category: incident.category,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      description: incident.description,
      location: safeLocation(location),
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      ...(incident.resolvedAt ? { resolvedAt: incident.resolvedAt } : { resolvedAt: NOT_AVAILABLE }),
      assignments: assignments.map((a) => {
        const team = teamMap.get(String(a.teamId))
        return {
          id: String(a._id),
          status: a.status,
          team: team
            ? { id: String(team._id), name: team.name, teamType: team.teamType, phone: team.phone }
            : { id: String(a.teamId) },
          createdAt: a.createdAt,
        }
      }),
      updates: updates.map((u) => ({
        statusFrom: u.statusFrom ?? null,
        statusTo: u.statusTo,
        createdAt: u.createdAt,
      })),
      notifications,
      risk: {
        advisory: true,
        note: 'Advisory only — assistive analysis, not a confirmed decision.',
        assessments: risks.map((r) => ({
          riskScore: r.riskScore,
          riskLevel: r.riskLevel,
          modelVersion: r.modelVersion,
          assessedAt: r.assessedAt,
        })),
      },
    },
  }
}

/** Single unsafe-area report. Same ownership-in-query guarantee as incidents. */
export async function buildUnsafeAreaRecord(filters: ReportFilters): Promise<Record<string, unknown>> {
  const user = await User.findById(filters.userId!).select('name email phone')
  if (!user) throw notFoundError('Selected user no longer exists.')
  const report = await UnsafeAreaReport.findOne({ _id: filters.unsafeReportId!, reportedBy: user._id })
  if (!report) {
    const exists = await UnsafeAreaReport.findById(filters.unsafeReportId!).select('_id')
    if (exists) throw badRequest('Selected unsafe-area report does not belong to the selected user.')
    throw notFoundError('Selected unsafe-area report no longer exists.')
  }
  const location = report.locationId ? await Location.findById(report.locationId) : null
  const contacts = await userContacts(user._id)
  return {
    subjectUser: subjectUserBlock(user, contacts),
    record: {
      id: String(report._id),
      category: report.category,
      description: report.description,
      severity: report.severity,
      isVerified: report.isVerified,
      location: safeLocation(location),
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    },
  }
}
