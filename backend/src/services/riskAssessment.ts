import { env } from '../config/env.js'
import { Incident, IncidentStatus, type IIncident } from '../models/Incident.js'
import { Location, type ILocation } from '../models/Location.js'
import { RiskAssessment, RiskLevel } from '../models/RiskAssessment.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { HttpError } from '../utils/errors.js'

/** Nearby radius in kilometres for contextual risk factors. */
export const NEARBY_KM = 2

const ACTIVE_INCIDENT_STATUSES = [
  IncidentStatus.REPORTED,
  IncidentStatus.ACKNOWLEDGED,
  IncidentStatus.ASSIGNED,
  IncidentStatus.IN_PROGRESS,
]

export interface RiskFactors {
  priority: string
  incidentType: string
  verifiedReports: number
  unverifiedReports: number
  activeIncidents: number
}

export interface AiRiskResult {
  riskScore: number
  riskLevel: RiskLevel
  modelVersion: string
  inputFactors: Record<string, unknown>[]
  assessedAt: Date
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180
  const earthKm = 6371
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return 2 * earthKm * Math.asin(Math.sqrt(a))
}

/**
 * Assemble scoring factors purely from stored records around the incident's
 * location. Free-text descriptions are never sent anywhere — only bounded,
 * enumerated values leave this function.
 */
export async function assembleFactors(incident: IIncident, location: ILocation): Promise<RiskFactors> {
  const [reports, activeOthers] = await Promise.all([
    UnsafeAreaReport.find().select('locationId isVerified'),
    Incident.find({
      _id: { $ne: incident._id },
      status: { $in: ACTIVE_INCIDENT_STATUSES },
    }).select('locationId'),
  ])

  const locationIds = new Set<string>()
  for (const r of reports) locationIds.add(String(r.locationId))
  for (const i of activeOthers) {
    if (i.locationId) locationIds.add(String(i.locationId))
  }
  const locs = locationIds.size > 0 ? await Location.find({ _id: { $in: [...locationIds] } }) : []
  const coords = new Map(locs.map((l) => [String(l._id), l]))

  const within = (locationId: unknown): boolean => {
    const l = coords.get(String(locationId))
    if (!l) return false
    return haversineKm(location.latitude, location.longitude, l.latitude, l.longitude) <= NEARBY_KM
  }

  let verifiedReports = 0
  let unverifiedReports = 0
  for (const r of reports) {
    if (!within(r.locationId)) continue
    if (r.isVerified) verifiedReports += 1
    else unverifiedReports += 1
  }
  let activeIncidents = 0
  for (const i of activeOthers) {
    if (i.locationId && within(i.locationId)) activeIncidents += 1
  }

  return {
    priority: incident.priority,
    incidentType: incident.type,
    verifiedReports,
    unverifiedReports,
    activeIncidents,
  }
}

function validateAiResult(body: unknown): AiRiskResult {
  const o = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const levels = Object.values(RiskLevel) as string[]

  if (
    typeof o.riskScore !== 'number' ||
    !Number.isInteger(o.riskScore) ||
    o.riskScore < 0 ||
    o.riskScore > 100
  ) {
    throw new HttpError(502, 'AI service returned an invalid risk score.')
  }
  if (typeof o.riskLevel !== 'string' || !levels.includes(o.riskLevel)) {
    throw new HttpError(502, 'AI service returned an invalid risk level.')
  }
  if (typeof o.modelVersion !== 'string' || o.modelVersion.trim() === '' || o.modelVersion.length > 50) {
    throw new HttpError(502, 'AI service returned an invalid model version.')
  }
  if (!Array.isArray(o.inputFactors)) {
    throw new HttpError(502, 'AI service returned invalid input factors.')
  }
  const assessedAt = new Date(typeof o.assessedAt === 'string' ? o.assessedAt : NaN)
  if (Number.isNaN(assessedAt.getTime())) {
    throw new HttpError(502, 'AI service returned an invalid assessment time.')
  }

  return {
    riskScore: o.riskScore,
    riskLevel: o.riskLevel as RiskLevel,
    modelVersion: o.modelVersion.trim(),
    inputFactors: o.inputFactors as Record<string, unknown>[],
    assessedAt,
  }
}

/**
 * Call the configured AI service and strictly validate its response.
 * Throws 502 (bad/unreachable service) or 504 (timeout). Never stores.
 * No credentials are involved — the service needs no API key.
 */
export async function callAiService(factors: RiskFactors): Promise<AiRiskResult> {
  const url = `${env.aiServiceUrl.replace(/\/+$/, '')}/risk/assess`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(factors),
      signal: AbortSignal.timeout(env.aiServiceTimeoutMs),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new HttpError(504, 'AI service timed out. Please try again later.')
    }
    throw new HttpError(502, 'AI service is unavailable. Please try again later.')
  }

  if (!res.ok) {
    throw new HttpError(502, 'AI service could not score these factors.')
  }
  let body: unknown
  try {
    body = (await res.json()) as unknown
  } catch {
    throw new HttpError(502, 'AI service returned an unreadable response.')
  }
  return validateAiResult(body)
}

/**
 * Full assessment flow for one incident: assemble real factors, score via the
 * AI service, validate, then store. The incident itself is never modified.
 */
export async function assessIncident(incident: IIncident, location: ILocation) {
  const factors = await assembleFactors(incident, location)
  const result = await callAiService(factors)
  const doc = await RiskAssessment.create({
    locationId: location._id,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    modelVersion: result.modelVersion,
    inputFactors: result.inputFactors,
    assessedAt: result.assessedAt,
  })
  return doc
}
