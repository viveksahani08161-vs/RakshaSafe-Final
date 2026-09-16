export interface ValidationIssue {
  field: string
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s\-()]{6,19}$/

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function isPhone(value: string): boolean {
  return PHONE_RE.test(value.trim())
}

export interface RegisterInput {
  name: string
  email: string
  phone: string
  password: string
  language?: string
}

export function validateRegister(body: unknown): { input?: RegisterInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  const phone = typeof b.phone === 'string' ? b.phone.trim() : ''
  const password = typeof b.password === 'string' ? b.password : ''
  const language = typeof b.language === 'string' && b.language.trim() !== '' ? b.language.trim() : undefined

  if (name.length < 2 || name.length > 100) {
    issues.push({ field: 'name', message: 'Name must be between 2 and 100 characters.' })
  }
  if (!isEmail(email)) {
    issues.push({ field: 'email', message: 'A valid email address is required.' })
  }
  if (!isPhone(phone)) {
    issues.push({ field: 'phone', message: 'A valid phone number is required.' })
  }
  if (password.length < 8 || password.length > 128) {
    issues.push({ field: 'password', message: 'Password must be between 8 and 128 characters.' })
  }
  if (language !== undefined && language.length > 20) {
    issues.push({ field: 'language', message: 'Language must be at most 20 characters.' })
  }

  if (issues.length > 0) return { issues }
  return { input: { name, email, phone, password, language } }
}

export interface LoginInput {
  identifier: string
  password: string
}

export function validateLogin(body: unknown): { input?: LoginInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  const identifier = typeof b.identifier === 'string' ? b.identifier.trim() : ''
  const password = typeof b.password === 'string' ? b.password : ''

  if (identifier.length === 0) {
    issues.push({ field: 'identifier', message: 'Email or phone number is required.' })
  }
  if (password.length === 0) {
    issues.push({ field: 'password', message: 'Password is required.' })
  }

  if (issues.length > 0) return { issues }
  return { input: { identifier, password } }
}

export interface ProfileUpdateInput {
  name?: string
  email?: string
  phone?: string
  language?: string
}

export function validateProfileUpdate(
  body: unknown,
): { input?: ProfileUpdateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  const input: ProfileUpdateInput = {}

  if (b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (name.length < 2 || name.length > 100) {
      issues.push({ field: 'name', message: 'Name must be between 2 and 100 characters.' })
    } else {
      input.name = name
    }
  }
  if (b.email !== undefined) {
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
    if (!isEmail(email)) {
      issues.push({ field: 'email', message: 'A valid email address is required.' })
    } else {
      input.email = email
    }
  }
  if (b.phone !== undefined) {
    const phone = typeof b.phone === 'string' ? b.phone.trim() : ''
    if (!isPhone(phone)) {
      issues.push({ field: 'phone', message: 'A valid phone number is required.' })
    } else {
      input.phone = phone
    }
  }
  if (b.language !== undefined) {
    const language = typeof b.language === 'string' ? b.language.trim() : ''
    if (language.length > 20) {
      issues.push({ field: 'language', message: 'Language must be at most 20 characters.' })
    } else {
      input.language = language === '' ? undefined : language
    }
  }

  if (issues.length > 0) return { issues }
  if (Object.keys(input).length === 0) {
    return { issues: [{ field: 'body', message: 'At least one field (name, email, phone, language) must be provided.' }] }
  }
  return { input }
}
