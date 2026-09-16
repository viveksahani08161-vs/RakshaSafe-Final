import type { ValidationIssue } from './auth.js'

export interface InlineLocationInput {
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  country?: string
  accuracy?: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function checkOptionalText(
  value: unknown,
  field: string,
  max: number,
  issues: ValidationIssue[],
): string | undefined {
  if (value === undefined) return undefined
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return undefined
  if (text.length > max) {
    issues.push({ field, message: `${field} must be at most ${max} characters.` })
    return undefined
  }
  return text
}

/**
 * Validate inline coordinates for creating a Locations record.
 * Never invents values: latitude/longitude are required and range-checked.
 */
export function validateInlineLocation(value: unknown, issues: ValidationIssue[]): InlineLocationInput | undefined {
  if (value === undefined) return undefined
  const o = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>

  const latOk = isFiniteNumber(o.latitude) && o.latitude >= -90 && o.latitude <= 90
  const lngOk = isFiniteNumber(o.longitude) && o.longitude >= -180 && o.longitude <= 180
  if (!latOk) {
    issues.push({ field: 'location.latitude', message: 'Latitude must be a number between -90 and 90.' })
  }
  if (!lngOk) {
    issues.push({ field: 'location.longitude', message: 'Longitude must be a number between -180 and 180.' })
  }
  let accuracy: number | undefined
  if (o.accuracy !== undefined) {
    if (!isFiniteNumber(o.accuracy) || o.accuracy < 0) {
      issues.push({ field: 'location.accuracy', message: 'Accuracy must be a non-negative number.' })
    } else {
      accuracy = o.accuracy
    }
  }
  const address = checkOptionalText(o.address, 'location.address', 200, issues)
  const city = checkOptionalText(o.city, 'location.city', 100, issues)
  const state = checkOptionalText(o.state, 'location.state', 100, issues)
  const country = checkOptionalText(o.country, 'location.country', 100, issues)

  if (!latOk || !lngOk || issues.length > 0) return undefined
  return {
    latitude: o.latitude as number,
    longitude: o.longitude as number,
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(country ? { country } : {}),
    ...(accuracy !== undefined ? { accuracy } : {}),
  }
}
