import { IncidentPriority, IncidentType } from '../models/Incident.js'
import type { ValidationIssue } from './auth.js'
import { isValidObjectId } from './emergencyContact.js'
import { validateInlineLocation, type InlineLocationInput } from './location.js'

export interface IncidentCreateInput {
  type: IncidentType
  category: string
  description: string
  priority: IncidentPriority
  locationId?: string
  location?: InlineLocationInput
}

export interface IncidentDetailsInput {
  type: IncidentType
  category: string
  description: string
  priority: IncidentPriority
}

/** Shared rule set for the case fields a user may raise or edit. Tungsten: the
 * server never trusts userId/status/locationId from the body here — status and
 * ownership are resolved from the authenticated request and stored location. */
function validateIncidentDetails(
  b: Record<string, unknown>,
  issues: ValidationIssue[],
): IncidentDetailsInput | undefined {
  let type: IncidentType | undefined
  if (b.type === IncidentType.SAFETY || b.type === IncidentType.DISASTER) {
    type = b.type
  } else {
    issues.push({ field: 'type', message: 'Type must be Safety or Disaster.' })
  }

  const category = typeof b.category === 'string' ? b.category.trim() : ''
  if (category.length < 2 || category.length > 100) {
    issues.push({ field: 'category', message: 'Category must be between 2 and 100 characters.' })
  }

  const description = typeof b.description === 'string' ? b.description.trim() : ''
  if (description.length < 1 || description.length > 2000) {
    issues.push({ field: 'description', message: 'Description is required (max 2000 characters).' })
  }

  let priority: IncidentPriority | undefined
  const priorities = Object.values(IncidentPriority) as string[]
  if (typeof b.priority === 'string' && priorities.includes(b.priority)) {
    priority = b.priority as IncidentPriority
  } else {
    issues.push({ field: 'priority', message: 'Priority must be LOW, MEDIUM, HIGH or CRITICAL.' })
  }

  if (type === undefined || priority === undefined) return undefined
  return { type, category, description, priority }
}

export function validateIncidentUpdate(
  body: unknown,
): { input?: Partial<IncidentDetailsInput>; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  const input: Partial<IncidentDetailsInput> = {}

  if (b.type !== undefined) {
    if (b.type === IncidentType.SAFETY || b.type === IncidentType.DISASTER) {
      input.type = b.type
    } else {
      issues.push({ field: 'type', message: 'Type must be Safety or Disaster.' })
    }
  }

  if (b.category !== undefined) {
    const category = typeof b.category === 'string' ? b.category.trim() : ''
    if (category.length < 2 || category.length > 100) {
      issues.push({ field: 'category', message: 'Category must be between 2 and 100 characters.' })
    } else {
      input.category = category
    }
  }

  if (b.description !== undefined) {
    const description = typeof b.description === 'string' ? b.description.trim() : ''
    if (description.length < 1 || description.length > 2000) {
      issues.push({ field: 'description', message: 'Description is required (max 2000 characters).' })
    } else {
      input.description = description
    }
  }

  if (b.priority !== undefined) {
    const priorities = Object.values(IncidentPriority) as string[]
    if (typeof b.priority === 'string' && priorities.includes(b.priority)) {
      input.priority = b.priority as IncidentPriority
    } else {
      issues.push({ field: 'priority', message: 'Priority must be LOW, MEDIUM, HIGH or CRITICAL.' })
    }
  }

  // Only the four user-settable detail fields are accepted on edit. Anything
  // else (userId, status, locationId, location) is ignored — never applied.
  if (issues.length > 0) return { issues }
  if (Object.keys(input).length === 0) {
    return {
      issues: [
        { field: 'body', message: 'At least one field (type, category, description, priority) must be provided.' },
      ],
    }
  }

  return { input }
}

export function validateIncidentCreate(
  body: unknown,
): { input?: IncidentCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  const details = validateIncidentDetails(b, issues)

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

  if (issues.length > 0) return { issues }
  const fields = details as IncidentDetailsInput
  return {
    input: {
      type: fields.type,
      category: fields.category,
      description: fields.description,
      priority: fields.priority,
      ...(locationId ? { locationId } : {}),
      ...(locationProvided && location ? { location } : {}),
    },
  }
}
