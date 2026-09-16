import mongoose from 'mongoose'
import { isEmail, isPhone, type ValidationIssue } from './auth.js'

export function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)
}

export interface ContactCreateInput {
  name: string
  phone: string
  email?: string
  relationship?: string
  notifyViaSms: boolean
  notifyViaEmail: boolean
}

export interface ContactUpdateInput {
  name?: string
  phone?: string
  email?: string
  relationship?: string
  notifyViaSms?: boolean
  notifyViaEmail?: boolean
}

function checkName(value: unknown, issues: ValidationIssue[]): string | undefined {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name.length < 2 || name.length > 100) {
    issues.push({ field: 'name', message: 'Name must be between 2 and 100 characters.' })
    return undefined
  }
  return name
}

function checkPhone(value: unknown, issues: ValidationIssue[]): string | undefined {
  const phone = typeof value === 'string' ? value.trim() : ''
  if (!isPhone(phone)) {
    issues.push({ field: 'phone', message: 'A valid phone number is required.' })
    return undefined
  }
  return phone
}

function checkEmail(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) return undefined
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (email === '') return undefined
  if (!isEmail(email) || email.length > 254) {
    issues.push({ field: 'email', message: 'A valid email address is required.' })
    return undefined
  }
  return email
}

function checkRelationship(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) return undefined
  const relationship = typeof value === 'string' ? value.trim() : ''
  if (relationship === '') return undefined
  if (relationship.length > 100) {
    issues.push({ field: 'relationship', message: 'Relationship must be at most 100 characters.' })
    return undefined
  }
  return relationship
}

function checkBoolean(
  value: unknown,
  field: 'notifyViaSms' | 'notifyViaEmail',
  issues: ValidationIssue[],
): boolean | undefined {
  if (typeof value !== 'boolean') {
    issues.push({ field, message: `${field} must be true or false.` })
    return undefined
  }
  return value
}

export function validateContactCreate(
  body: unknown,
): { input?: ContactCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  const name = checkName(b.name, issues)
  const phone = checkPhone(b.phone, issues)
  const email = checkEmail(b.email, issues)
  const relationship = checkRelationship(b.relationship, issues)
  const notifyViaSms = checkBoolean(b.notifyViaSms, 'notifyViaSms', issues)
  const notifyViaEmail = checkBoolean(b.notifyViaEmail, 'notifyViaEmail', issues)

  if (issues.length > 0) return { issues }
  return {
    input: {
      name: name as string,
      phone: phone as string,
      ...(email ? { email } : {}),
      ...(relationship ? { relationship } : {}),
      notifyViaSms: notifyViaSms as boolean,
      notifyViaEmail: notifyViaEmail as boolean,
    },
  }
}

export function validateContactUpdate(
  body: unknown,
): { input?: ContactUpdateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  const input: ContactUpdateInput = {}

  if (b.name !== undefined) {
    const name = checkName(b.name, issues)
    if (name !== undefined) input.name = name
  }
  if (b.phone !== undefined) {
    const phone = checkPhone(b.phone, issues)
    if (phone !== undefined) input.phone = phone
  }
  if (b.email !== undefined) {
    if (typeof b.email === 'string' && b.email.trim() === '') {
      input.email = undefined // clear the field
    } else {
      const email = checkEmail(b.email, issues)
      if (email !== undefined) input.email = email
    }
  }
  if (b.relationship !== undefined) {
    if (typeof b.relationship === 'string' && b.relationship.trim() === '') {
      input.relationship = undefined // clear the field
    } else {
      const relationship = checkRelationship(b.relationship, issues)
      if (relationship !== undefined) input.relationship = relationship
    }
  }
  if (b.notifyViaSms !== undefined) {
    const v = checkBoolean(b.notifyViaSms, 'notifyViaSms', issues)
    if (v !== undefined) input.notifyViaSms = v
  }
  if (b.notifyViaEmail !== undefined) {
    const v = checkBoolean(b.notifyViaEmail, 'notifyViaEmail', issues)
    if (v !== undefined) input.notifyViaEmail = v
  }

  if (issues.length > 0) return { issues }
  if (Object.keys(input).length === 0) {
    return {
      issues: [
        {
          field: 'body',
          message:
            'At least one field (name, phone, email, relationship, notifyViaSms, notifyViaEmail) must be provided.',
        },
      ],
    }
  }
  return { input }
}
