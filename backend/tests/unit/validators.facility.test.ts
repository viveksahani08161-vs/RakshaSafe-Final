import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateFacilityCreate, validateFacilityUpdate } from '../../src/validators/facility.js'

describe('validateFacilityCreate', () => {
  it('accepts a valid facility with inline coordinates', () => {
    const { input, issues } = validateFacilityCreate({
      name: '  Community Shelter  ',
      facilityType: 'Shelter',
      phone: '+91 98765 43210',
      location: { latitude: 28.61, longitude: 77.2, accuracy: 12 },
      capacity: 200,
      isOperational: true,
      operatingHours: '24x7',
    })
    assert.equal(issues, undefined)
    assert.equal(input?.name, 'Community Shelter')
    assert.equal(input?.facilityType, 'Shelter')
    assert.equal(input?.phone, '+91 98765 43210')
    assert.equal(input?.capacity, 200)
    assert.equal(input?.isOperational, true)
    assert.equal(input?.operatingHours, '24x7')
    assert.deepEqual(input?.location, { latitude: 28.61, longitude: 77.2, accuracy: 12 })
  })

  it('uses isOperational default of true when omitted', () => {
    const { input, issues } = validateFacilityCreate({
      name: 'Default Shelter',
      facilityType: 'Shelter',
      phone: '9876500000',
      locationId: '507f1f77bcf86cd799439011',
    })
    assert.equal(issues, undefined)
    assert.equal(input?.isOperational, true)
  })

  it('rejects a missing location', () => {
    const { issues } = validateFacilityCreate({
      name: 'No Location Shelter',
      facilityType: 'Shelter',
      phone: '9876500000',
    })
    assert.ok(issues?.some((i) => i.field === 'location'))
    assert.match(issues?.[0]?.message ?? '', /location/i)
  })

  it('rejects providing locationId and location together', () => {
    const { issues } = validateFacilityCreate({
      name: 'Both Shelter',
      facilityType: 'Shelter',
      phone: '9876500000',
      locationId: '507f1f77bcf86cd799439011',
      location: { latitude: 28.61, longitude: 77.2 },
    })
    assert.ok(issues?.some((i) => i.field === 'location'))
  })

  it('rejects invalid type, short name, and bad phone together', () => {
    const { issues } = validateFacilityCreate({
      name: 'X',
      facilityType: 'Stadium',
      phone: '123',
      location: { latitude: 28.61, longitude: 77.2 },
    })
    assert.ok(issues?.some((i) => i.field === 'name'))
    assert.ok(issues?.some((i) => i.field === 'facilityType'))
    assert.ok(issues?.some((i) => i.field === 'phone'))
  })

  it('rejects a non-whole or out-of-range capacity', () => {
    const { issues } = validateFacilityCreate({
      name: 'Capacity Shelter',
      facilityType: 'Shelter',
      phone: '9876500000',
      location: { latitude: 28.61, longitude: 77.2 },
      capacity: 1.5,
    })
    assert.ok(issues?.some((i) => i.field === 'capacity'))
  })

  it('rejects an invalid locationId reference', () => {
    const { issues } = validateFacilityCreate({
      name: 'Bad Ref Shelter',
      facilityType: 'Shelter',
      phone: '9876500000',
      locationId: 'not-an-object-id',
    })
    assert.ok(issues?.some((i) => i.field === 'locationId'))
  })
})

describe('validateFacilityUpdate', () => {
  it('requires at least one field', () => {
    const { issues } = validateFacilityUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('accepts a partial update and trims text fields', () => {
    const { input, issues } = validateFacilityUpdate({ name: '  Renamed   ', capacity: 120 })
    assert.equal(issues, undefined)
    assert.equal(input?.name, 'Renamed')
    assert.equal(input?.capacity, 120)
  })

  it('allows clearing operatingHours and setting capacity to null', () => {
    const { input, issues } = validateFacilityUpdate({ operatingHours: '', capacity: null })
    assert.equal(issues, undefined)
    assert.equal('operatingHours' in (input ?? {}), true)
    assert.equal(input?.operatingHours, undefined)
    assert.equal(input?.capacity, null)
  })

  it('rejects invalid values in a partial update', () => {
    const { issues } = validateFacilityUpdate({ isOperational: 'yes', capacity: -5, phone: 'x' })
    assert.ok(issues?.some((i) => i.field === 'isOperational'))
    assert.ok(issues?.some((i) => i.field === 'capacity'))
    assert.ok(issues?.some((i) => i.field === 'phone'))
  })
})