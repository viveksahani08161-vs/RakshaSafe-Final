import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateRescueTeamCreate,
  validateRescueTeamUpdate,
} from '../../src/validators/rescueTeam.js'

describe('validateRescueTeamCreate', () => {
  it('accepts a valid team, lowercasing email and trimming specializations', () => {
    const { input, issues } = validateRescueTeamCreate({
      name: '  District Medical Unit  ',
      teamType: 'Medical',
      phone: '9876500001',
      email: 'Unit@Example.com',
      isActive: true,
      specializations: [' Trauma ', 'First-aid', 'Disaster'],
      location: { latitude: 28.61, longitude: 77.2, city: ' New Delhi ' },
    })
    assert.equal(issues, undefined)
    assert.equal(input?.name, 'District Medical Unit')
    assert.equal(input?.teamType, 'Medical')
    assert.equal(input?.email, 'unit@example.com')
    assert.deepEqual(input?.specializations, ['Trauma', 'First-aid', 'Disaster'])
    assert.equal(input?.location?.city, 'New Delhi')
  })

  it('allows a team without any location', () => {
    const { input, issues } = validateRescueTeamCreate({
      name: 'Mobile Unit',
      teamType: 'Volunteer',
      phone: '9876500002',
    })
    assert.equal(issues, undefined)
    assert.equal(input?.isActive, true)
    assert.equal('locationId' in (input ?? {}), false)
    assert.equal('location' in (input ?? {}), false)
  })

  it('rejects unknown teamType and bad phone', () => {
    const { issues } = validateRescueTeamCreate({
      name: 'Bad Unit',
      teamType: 'Army',
      phone: '12',
    })
    assert.ok(issues?.some((i) => i.field === 'teamType'))
    assert.ok(issues?.some((i) => i.field === 'phone'))
  })

  it('rejects an invalid email and non-array specializations', () => {
    const { issues } = validateRescueTeamCreate({
      name: 'Email Unit',
      teamType: 'NGO',
      phone: '9876500003',
      email: 'not-an-email',
      specializations: 'Trauma',
    })
    assert.ok(issues?.some((i) => i.field === 'email'))
    assert.ok(issues?.some((i) => i.field === 'specializations'))
  })

  it('rejects locationId and inline location together', () => {
    const { issues } = validateRescueTeamCreate({
      name: 'Both Unit',
      teamType: 'Police',
      phone: '9876500004',
      locationId: '507f1f77bcf86cd799439011',
      location: { latitude: 28.61, longitude: 77.2 },
    })
    assert.ok(issues?.some((i) => i.field === 'location'))
  })
})

describe('validateRescueTeamUpdate', () => {
  it('requires at least one field', () => {
    const { issues } = validateRescueTeamUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('clears email with an empty string', () => {
    const { input, issues } = validateRescueTeamUpdate({ email: '' })
    assert.equal(issues, undefined)
    assert.equal(input?.email, undefined)
  })

  it('accepts a name/isActive update and trims the name', () => {
    const { input, issues } = validateRescueTeamUpdate({ name: '  Renamed Unit ', isActive: false })
    assert.equal(issues, undefined)
    assert.equal(input?.name, 'Renamed Unit')
    assert.equal(input?.isActive, false)
  })

  it('rejects a bad isActive value', () => {
    const { issues } = validateRescueTeamUpdate({ isActive: 'yes' })
    assert.ok(issues?.some((i) => i.field === 'isActive'))
  })
})