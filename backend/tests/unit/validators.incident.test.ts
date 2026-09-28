import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateIncidentCreate, validateIncidentUpdate } from '../../src/validators/incident.js'

const VALID_LOCATION = { latitude: 28.61, longitude: 77.2 }

describe('validateIncidentCreate', () => {
  it('accepts a valid disaster incident with inline coordinates', () => {
    const { input, issues } = validateIncidentCreate({
      type: 'Disaster',
      category: '  Flood  ',
      description: 'Waterlogging on the main road near the market.',
      priority: 'HIGH',
      location: VALID_LOCATION,
    })
    assert.equal(issues, undefined)
    assert.equal(input?.type, 'Disaster')
    assert.equal(input?.category, 'Flood')
    assert.equal(input?.priority, 'HIGH')
    assert.equal(input?.description, 'Waterlogging on the main road near the market.')
    assert.deepEqual(input?.location, VALID_LOCATION)
  })

  it('rejects an invalid type and priority', () => {
    const { issues } = validateIncidentCreate({
      type: 'Weather',
      category: 'Flood',
      description: 'description',
      priority: 'MAXIMUM',
      location: VALID_LOCATION,
    })
    assert.ok(issues?.some((i) => i.field === 'type'))
    assert.ok(issues?.some((i) => i.field === 'priority'))
  })

  it('rejects a too-short category and empty description', () => {
    const { issues } = validateIncidentCreate({
      type: 'Safety',
      category: 'A',
      description: ' ',
      priority: 'LOW',
      location: VALID_LOCATION,
    })
    assert.ok(issues?.some((i) => i.field === 'category'))
    assert.ok(issues?.some((i) => i.field === 'description'))
  })

  it('rejects locationId plus inline location together', () => {
    const { issues } = validateIncidentCreate({
      type: 'Safety',
      category: 'Hazard',
      description: 'Something is wrong here.',
      priority: 'MEDIUM',
      locationId: '507f1f77bcf86cd799439011',
      location: VALID_LOCATION,
    })
    assert.ok(issues?.some((i) => i.field === 'location'))
  })

  it('rejects a malformed locationId', () => {
    const { issues } = validateIncidentCreate({
      type: 'Safety',
      category: 'Hazard',
      description: 'Something is wrong here.',
      priority: 'MEDIUM',
      locationId: 'nope',
    })
    assert.ok(issues?.some((i) => i.field === 'locationId'))
  })
})

describe('validateIncidentUpdate', () => {
  it('requires at least one of the four case fields', () => {
    const { issues } = validateIncidentUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('never accepts status, ownership or location from the body', () => {
    const { input, issues } = validateIncidentUpdate({ description: 'Edited text', status: 'RESOLVED' })
    assert.equal(issues, undefined)
    assert.equal(input?.description, 'Edited text')
    assert.equal('status' in (input ?? {}), false)
    assert.equal('location' in (input ?? {}), false)
    assert.equal('userId' in (input ?? {}), false)
  })

  it('accepts a single-field priority update', () => {
    const { input, issues } = validateIncidentUpdate({ priority: 'CRITICAL' })
    assert.equal(issues, undefined)
    assert.equal(input?.priority, 'CRITICAL')
  })

  it('rejects a bad type in updates', () => {
    const { issues } = validateIncidentUpdate({ type: 'Other' })
    assert.ok(issues?.some((i) => i.field === 'type'))
  })
})