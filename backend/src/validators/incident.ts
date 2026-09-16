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

export function validateIncidentCreate(
  body: unknown,
): { input?: IncidentCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

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
  return {
    input: {
      type: type as IncidentType,
      category,
      description,
      priority: priority as IncidentPriority,
      ...(locationId ? { locationId } : {}),
      ...(locationProvided && location ? { location } : {}),
    },
  }
}
