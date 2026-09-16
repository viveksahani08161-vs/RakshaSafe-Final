import type { ValidationIssue } from './auth.js'
import { isValidObjectId } from './emergencyContact.js'
import { validateInlineLocation, type InlineLocationInput } from './location.js'

export interface UnsafeReportCreateInput {
  category: string
  description: string
  severity: string
  locationId?: string
  location?: InlineLocationInput
}

function checkText(value: unknown, field: string, min: number, max: number, issues: ValidationIssue[]): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length < min || text.length > max) {
    issues.push({ field, message: `${field} must be between ${min} and ${max} characters.` })
    return undefined
  }
  return text
}

export function validateUnsafeReportCreate(
  body: unknown,
): { input?: UnsafeReportCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  // No documented enums: category/severity are validated as bounded strings only.
  const category = checkText(b.category, 'category', 2, 100, issues)
  const description = checkText(b.description, 'description', 1, 2000, issues)
  const severity = checkText(b.severity, 'severity', 2, 50, issues)

  let locationId: string | undefined
  if (b.locationId !== undefined) {
    if (!isValidObjectId(b.locationId)) {
      issues.push({ field: 'locationId', message: 'locationId must be a valid id.' })
    } else {
      locationId = b.locationId
    }
  }
  const location = validateInlineLocation(b.location, issues)
  const locationProvided = b.location !== undefined
  if (locationId && locationProvided) {
    issues.push({ field: 'location', message: 'Provide either locationId or location, not both.' })
  }
  // The schema requires locationId: a report without a location is rejected.
  if (!locationId && !locationProvided) {
    issues.push({ field: 'location', message: 'A location is required for an unsafe-area report.' })
  }

  if (issues.length > 0) return { issues }
  return {
    input: {
      category: category as string,
      description: description as string,
      severity: severity as string,
      ...(locationId ? { locationId } : {}),
      ...(locationProvided && location ? { location } : {}),
    },
  }
}

export function validateVerifyUpdate(
  body: unknown,
): { isVerified?: boolean; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  if (typeof b.isVerified !== 'boolean') {
    issues.push({ field: 'isVerified', message: 'isVerified must be true or false.' })
    return { issues }
  }
  return { isVerified: b.isVerified }
}
