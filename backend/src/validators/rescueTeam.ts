import { TeamType } from '../models/RescueTeam.js'
import { isEmail, isPhone, type ValidationIssue } from './auth.js'

export interface RescueTeamCreateInput {
  name: string
  teamType: TeamType
  phone: string
  email?: string
  isActive: boolean
  specializations?: string[]
}

export interface RescueTeamUpdateInput {
  name?: string
  teamType?: TeamType
  phone?: string
  email?: string
  isActive?: boolean
  specializations?: string[]
}

function checkName(value: unknown, issues: ValidationIssue[]): string | undefined {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name.length < 2 || name.length > 150) {
    issues.push({ field: 'name', message: 'Name must be between 2 and 150 characters.' })
    return undefined
  }
  return name
}

function checkTeamType(value: unknown, issues: ValidationIssue[]): TeamType | undefined {
  const allowed = Object.values(TeamType) as string[]
  if (typeof value === 'string' && allowed.includes(value)) {
    return value as TeamType
  }
  issues.push({ field: 'teamType', message: `Team type must be one of: ${allowed.join(', ')}.` })
  return undefined
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

function checkSpecializations(value: unknown, issues: ValidationIssue[]): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    issues.push({ field: 'specializations', message: 'Specializations must be an array of strings.' })
    return undefined
  }
  if (value.length > 20) {
    issues.push({ field: 'specializations', message: 'At most 20 specializations are allowed.' })
    return undefined
  }
  const out: string[] = []
  for (const item of value) {
    const text = typeof item === 'string' ? item.trim() : ''
    if (text === '' || text.length > 50) {
      issues.push({
        field: 'specializations',
        message: 'Each specialization must be 1–50 characters.',
      })
      return undefined
    }
    out.push(text)
  }
  return out
}

function checkIsActive(value: unknown, issues: ValidationIssue[]): boolean | undefined {
  if (typeof value !== 'boolean') {
    issues.push({ field: 'isActive', message: 'isActive must be true or false.' })
    return undefined
  }
  return value
}

export function validateRescueTeamCreate(
  body: unknown,
): { input?: RescueTeamCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  const name = checkName(b.name, issues)
  const teamType = checkTeamType(b.teamType, issues)
  const phone = checkPhone(b.phone, issues)
  const email = checkEmail(b.email, issues)
  const specializations = checkSpecializations(b.specializations, issues)

  let isActive = true
  if (b.isActive !== undefined) {
    const v = checkIsActive(b.isActive, issues)
    if (v !== undefined) isActive = v
  }

  if (issues.length > 0) return { issues }
  return {
    input: {
      name: name as string,
      teamType: teamType as TeamType,
      phone: phone as string,
      ...(email ? { email } : {}),
      isActive,
      ...(specializations ? { specializations } : {}),
    },
  }
}

export function validateRescueTeamUpdate(
  body: unknown,
): { input?: RescueTeamUpdateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  const input: RescueTeamUpdateInput = {}

  if (b.name !== undefined) {
    const name = checkName(b.name, issues)
    if (name !== undefined) input.name = name
  }
  if (b.teamType !== undefined) {
    const teamType = checkTeamType(b.teamType, issues)
    if (teamType !== undefined) input.teamType = teamType
  }
  if (b.phone !== undefined) {
    const phone = checkPhone(b.phone, issues)
    if (phone !== undefined) input.phone = phone
  }
  if (b.email !== undefined) {
    if (typeof b.email === 'string' && b.email.trim() === '') {
      input.email = undefined
    } else {
      const email = checkEmail(b.email, issues)
      if (email !== undefined) input.email = email
    }
  }
  if (b.isActive !== undefined) {
    const isActive = checkIsActive(b.isActive, issues)
    if (isActive !== undefined) input.isActive = isActive
  }
  if (b.specializations !== undefined) {
    const specializations = checkSpecializations(b.specializations, issues)
    if (specializations !== undefined) input.specializations = specializations
  }

  if (issues.length > 0) return { issues }
  if (Object.keys(input).length === 0) {
    return {
      issues: [
        {
          field: 'body',
          message: 'At least one field (name, teamType, phone, email, isActive, specializations) must be provided.',
        },
      ],
    }
  }
  return { input }
}
