import type { ValidationIssue } from './auth.js'

export interface NearbyQueryInput {
  latitude: number
  longitude: number
  radiusKm: number
}

/** Default search radius when the caller omits radiusKm. */
export const DEFAULT_NEARBY_RADIUS_KM = 25

/** Hard upper bound — a radius above this is rejected, never silently clamped. */
export const MAX_NEARBY_RADIUS_KM = 100

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

/**
 * Validate a nearby-resource query (?lat=&lng=&radiusKm=).
 * Accepts `lat`/`latitude` and `lng`/`longitude`/`lon` spellings.
 * Never invents coordinates: latitude/longitude are required and
 * range-checked; failures are reported, never defaulted.
 */
export function validateNearbyQuery(
  query: unknown,
  defaultRadiusKm: number = DEFAULT_NEARBY_RADIUS_KM,
): {
  input?: NearbyQueryInput
  issues?: ValidationIssue[]
} {
  const issues: ValidationIssue[] = []
  const q = (typeof query === 'object' && query !== null ? query : {}) as Record<string, unknown>

  const lat = toFiniteNumber(q.lat ?? q.latitude)
  const lng = toFiniteNumber(q.lng ?? q.longitude ?? q.lon)

  if (lat === undefined || lat < -90 || lat > 90) {
    issues.push({ field: 'lat', message: 'Latitude must be a number between -90 and 90.' })
  }
  if (lng === undefined || lng < -180 || lng > 180) {
    issues.push({ field: 'lng', message: 'Longitude must be a number between -180 and 180.' })
  }

  let radiusKm =
    Number.isFinite(defaultRadiusKm) && defaultRadiusKm > 0 ? defaultRadiusKm : DEFAULT_NEARBY_RADIUS_KM
  if (q.radiusKm !== undefined) {
    const radius = toFiniteNumber(q.radiusKm)
    if (radius === undefined || radius <= 0 || radius > MAX_NEARBY_RADIUS_KM) {
      issues.push({
        field: 'radiusKm',
        message: `Radius must be a number greater than 0 and at most ${MAX_NEARBY_RADIUS_KM} km.`,
      })
    } else {
      radiusKm = radius
    }
  }

  if (issues.length > 0 || lat === undefined || lng === undefined) return { issues }
  return { input: { latitude: lat, longitude: lng, radiusKm } }
}

/**
 * Validate an optional radiusKm on its own (incident endpoints supply the
 * point from the stored incident location). Defaults when omitted.
 */
export function validateRadiusKm(
  value: unknown,
  defaultRadiusKm: number = DEFAULT_NEARBY_RADIUS_KM,
): { radiusKm?: number; issue?: ValidationIssue } {
  const fallback =
    Number.isFinite(defaultRadiusKm) && defaultRadiusKm > 0 ? defaultRadiusKm : DEFAULT_NEARBY_RADIUS_KM
  if (value === undefined) return { radiusKm: fallback }
  const radius = toFiniteNumber(value)
  if (radius === undefined || radius <= 0 || radius > MAX_NEARBY_RADIUS_KM) {
    return {
      issue: {
        field: 'radiusKm',
        message: `Radius must be a number greater than 0 and at most ${MAX_NEARBY_RADIUS_KM} km.`,
      },
    }
  }
  return { radiusKm: radius }
}
