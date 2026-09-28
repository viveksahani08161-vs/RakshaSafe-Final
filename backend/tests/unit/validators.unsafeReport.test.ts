import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateUnsafeReportCreate,
  validateUnsafeReportUpdate,
  validateUnsafeReportAdminUpdate,
  validateVerifyUpdate,
} from '../../src/validators/unsafeReport.js'

const VALID_LOCATION = { latitude: 28.61, longitude: 77.2 }

describe('validateUnsafeReportCreate', () => {
  it('accepts a valid report with inline coordinates', () => {
    const { input, issues } = validateUnsafeReportCreate({
      category: '  Flood zone  ',
      description: 'Waterlogging near the bus stand.',
      severity: '  High risk  ',
      location: VALID_LOCATION,
    })
    assert.equal(issues, undefined)
    assert.equal(input?.category, 'Flood zone')
    assert.equal(input?.severity, 'High risk')
    assert.deepEqual(input?.location, VALID_LOCATION)
  })

  it('rejects a report without any location', () => {
    const { issues } = validateUnsafeReportCreate({
      category: 'Flood zone',
      description: 'Waterlogging.',
      severity: 'High',
    })
    assert.ok(issues?.some((i) => i.field === 'location'))
  })

  it('rejects text fields outside their length bounds', () => {
    const { issues } = validateUnsafeReportCreate({
      category: 'Z',
      description: '',
      severity: 'S',
      location: VALID_LOCATION,
    })
    assert.ok(issues?.some((i) => i.field === 'category'))
    assert.ok(issues?.some((i) => i.field === 'description'))
    assert.ok(issues?.some((i) => i.field === 'severity'))
  })

  it('rejects locationId plus inline location together', () => {
    const { issues } = validateUnsafeReportCreate({
      category: 'Flood zone',
      description: 'Waterlogging.',
      severity: 'High',
      locationId: '507f1f77bcf86cd799439011',
      location: VALID_LOCATION,
    })
    assert.ok(issues?.some((i) => i.field === 'location'))
  })
})

describe('validateUnsafeReportUpdate', () => {
  it('requires at least one field', () => {
    const { issues } = validateUnsafeReportUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('accepts a partial update', () => {
    const { input, issues } = validateUnsafeReportUpdate({ severity: ' Critical ' })
    assert.equal(issues, undefined)
    assert.equal(input?.severity, 'Critical')
  })
})

describe('validateUnsafeReportAdminUpdate', () => {
  it('accepts a verification-only payload', () => {
    const { input, issues } = validateUnsafeReportAdminUpdate({ isVerified: true })
    assert.equal(issues, undefined)
    assert.equal(input?.isVerified, true)
  })

  it('rejects a non-boolean isVerified', () => {
    const { issues } = validateUnsafeReportAdminUpdate({ isVerified: 'yes' })
    assert.ok(issues?.some((i) => i.field === 'isVerified'))
  })
})

describe('validateVerifyUpdate', () => {
  it('returns the boolean when it is valid', () => {
    assert.deepEqual(validateVerifyUpdate({ isVerified: false }), { isVerified: false })
  })

  it('reports an issue for a missing or non-boolean value', () => {
    assert.ok(validateVerifyUpdate({}).issues?.length)
    assert.ok(validateVerifyUpdate({ isVerified: 1 }).issues?.some((i) => i.field === 'isVerified'))
  })
})