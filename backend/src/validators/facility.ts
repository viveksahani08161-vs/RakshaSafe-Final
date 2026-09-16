import { FacilityType } from '../models/Facility.js'
import { isPhone, type ValidationIssue } from './auth.js'
import { isValidObjectId } from './emergencyContact.js'
import { validateInlineLocation, type InlineLocationInput } from './location.js'

export interface FacilityCreateInput {
  name: string
  facilityType: FacilityType
  locationId?: string
  location?: InlineLocationInput
  phone: string
  capacity?: number
  isOperational: boolean
  operatingHours?: string
}

export interface FacilityUpdateInput {
  name?: string
  facilityType?: FacilityType
  locationId?: string
  location?: InlineLocationInput
  phone?: string
  capacity?: number | null
  isOperational?: boolean
  operatingHours?: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function checkName(value: unknown, issues: ValidationIssue[]): string | undefined {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name.length < 2 || name.length > 150) {
    issues.push({ field: 'name', message: 'Name must be between 2 and 150 characters.' })
    return undefined
  }
  return name
}

function checkType(value: unknown, issues: ValidationIssue[]): FacilityType | undefined {
  const allowed = Object.values(FacilityType) as string[]
  if (typeof value === 'string' && allowed.includes(value)) {
    return value as FacilityType
  }
  issues.push({ field: 'facilityType', message: `Facility type must be one of: ${allowed.join(', ')}.` })
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

function checkCapacity(value: unknown, issues: ValidationIssue[]): number | undefined {
  if (!isFiniteNumber(value) || !Number.isInteger(value) || value < 0 || value > 1000000) {
    issues.push({ field: 'capacity', message: 'Capacity must be a whole number between 0 and 1000000.' })
    return undefined
  }
  return value
}

function checkOperatingHours(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (value === undefined) return undefined
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return undefined
  if (text.length > 200) {
    issues.push({ field: 'operatingHours', message: 'Operating hours must be at most 200 characters.' })
    return undefined
  }
  return text
}

function checkLocationRef(
  b: Record<string, unknown>,
  issues: ValidationIssue[],
): { locationId?: string; location?: InlineLocationInput; provided: boolean } {
  let locationId: string | undefined
  if (b.locationId !== undefined) {
    if (!isValidObjectId(b.locationId)) {
      issues.push({ field: 'locationId', message: 'locationId must be a valid id.' })
    } else {
      locationId = b.locationId
    }
  }
  const location = validateInlineLocation(b.location, issues)
  const provided = b.location !== undefined
  if (locationId && provided) {
    issues.push({ field: 'location', message: 'Provide either locationId or location, not both.' })
  }
  return { ...(locationId ? { locationId } : {}), ...(provided && location ? { location } : {}), provided }
}

export function validateFacilityCreate(
  body: unknown,
): { input?: FacilityCreateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>

  const name = checkName(b.name, issues)
  const facilityType = checkType(b.facilityType, issues)
  const phone = checkPhone(b.phone, issues)
  const ref = checkLocationRef(b, issues)

  let capacity: number | undefined
  if (b.capacity !== undefined && b.capacity !== null) {
    const c = checkCapacity(b.capacity, issues)
    if (c !== undefined) capacity = c
  }

  let isOperational = true
  if (b.isOperational !== undefined) {
    if (typeof b.isOperational !== 'boolean') {
      issues.push({ field: 'isOperational', message: 'isOperational must be true or false.' })
    } else {
      isOperational = b.isOperational
    }
  }

  const operatingHours = checkOperatingHours(b.operatingHours, issues)

  if (!ref.locationId && !ref.location) {
    issues.push({ field: 'location', message: 'A location (locationId or coordinates) is required.' })
  }

  if (issues.length > 0) return { issues }
  return {
    input: {
      name: name as string,
      facilityType: facilityType as FacilityType,
      phone: phone as string,
      ...(ref.locationId ? { locationId: ref.locationId } : {}),
      ...(ref.location ? { location: ref.location } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      isOperational,
      ...(operatingHours ? { operatingHours } : {}),
    },
  }
}

export function validateFacilityUpdate(
  body: unknown,
): { input?: FacilityUpdateInput; issues?: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const b = (body ?? {}) as Record<string, unknown>
  const input: FacilityUpdateInput = {}

  if (b.name !== undefined) {
    const name = checkName(b.name, issues)
    if (name !== undefined) input.name = name
  }
  if (b.facilityType !== undefined) {
    const facilityType = checkType(b.facilityType, issues)
    if (facilityType !== undefined) input.facilityType = facilityType
  }
  if (b.phone !== undefined) {
    const phone = checkPhone(b.phone, issues)
    if (phone !== undefined) input.phone = phone
  }
  if (b.locationId !== undefined || b.location !== undefined) {
    const ref = checkLocationRef(b, issues)
    if (ref.locationId) input.locationId = ref.locationId
    if (ref.location) input.location = ref.location
  }
  if (b.capacity !== undefined) {
    if (b.capacity === null) {
      input.capacity = null
    } else {
      const capacity = checkCapacity(b.capacity, issues)
      if (capacity !== undefined) input.capacity = capacity
    }
  }
  if (b.isOperational !== undefined) {
    if (typeof b.isOperational !== 'boolean') {
      issues.push({ field: 'isOperational', message: 'isOperational must be true or false.' })
    } else {
      input.isOperational = b.isOperational
    }
  }
  if (b.operatingHours !== undefined) {
    if (typeof b.operatingHours === 'string' && b.operatingHours.trim() === '') {
      input.operatingHours = undefined
    } else {
      const operatingHours = checkOperatingHours(b.operatingHours, issues)
      if (operatingHours !== undefined) input.operatingHours = operatingHours
    }
  }

  if (issues.length > 0) return { issues }
  if (Object.keys(input).length === 0) {
    return {
      issues: [
        {
          field: 'body',
          message:
            'At least one field (name, facilityType, phone, location, capacity, isOperational, operatingHours) must be provided.',
        },
      ],
    }
  }
  return { input }
}
