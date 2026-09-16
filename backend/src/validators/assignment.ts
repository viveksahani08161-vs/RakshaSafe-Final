import { AssignmentStatus } from '../models/RescueAssignment.js'
import type { ValidationIssue } from './auth.js'
import { isValidObjectId } from './emergencyContact.js'

export interface AssignmentCreateInput {
  teamId: string
  notes?: string
}

export interface AssignmentUpdateInput {
  status?: AssignmentStatus
  notes?: string
}

function checkNotes(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) return undefined
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return undefined
  if (text.length > 500) {
    issues.push({ field: 'notes', message: 'Notes must be at most 500 characters.' })
    return undefined
  }
  return text
}

export function validateAssignmentCreate(
  body: unknown,
): { input?: AssignmentCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  let teamId: string | undefined
  if (!isValidObjectId(b.teamId)) {
    issues.push({ field: 'teamId', message: 'teamId must be a valid id.' })
  } else {
    teamId = b.teamId
  }
  const notes = checkNotes(b.notes, issues)

  if (issues.length > 0) return { issues }
  return {
    input: { teamId: teamId as string, ...(notes ? { notes } : {}) },
  }
}

export function validateAssignmentUpdate(
  body: unknown,
): { input?: AssignmentUpdateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  const input: AssignmentUpdateInput = {}

  if (b.status !== undefined) {
    const allowed = Object.values(AssignmentStatus) as string[]
    if (typeof b.status === 'string' && allowed.includes(b.status)) {
      input.status = b.status as AssignmentStatus
    } else {
      issues.push({ field: 'status', message: `Status must be one of: ${allowed.join(', ')}.` })
    }
  }
  if (b.notes !== undefined) {
    if (typeof b.notes === 'string' && b.notes.trim() === '') {
      input.notes = undefined
    } else {
      const notes = checkNotes(b.notes, issues)
      if (notes !== undefined) input.notes = notes
    }
  }

  if (issues.length > 0) return { issues }
  if (Object.keys(input).length === 0) {
    return {
      issues: [{ field: 'body', message: 'At least one field (status, notes) must be provided.' }],
    }
  }
  return { input }
}
