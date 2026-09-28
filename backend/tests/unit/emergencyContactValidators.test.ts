import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateContactCreate,
  validateContactUpdate,
  isValidObjectId,
} from '../../src/validators/emergencyContact.js'

describe('emergency contact create validator', () => {
  it('accepts a valid contact', () => {
    const { input, issues } = validateContactCreate({
      name: 'Priya Rao',
      phone: '9876543210',
      email: 'priya@example.com',
      relationship: 'Sister',
      notifyViaSms: true,
      notifyViaEmail: false,
      isPrimary: true,
    })
    assert.equal(issues, undefined)
    assert.equal(input?.phone, '+919876543210') // normalized by the validator
    assert.equal(input?.name, 'Priya Rao')
  })

  it('rejects a too-short name', () => {
    const { issues } = validateContactCreate({
      name: 'A',
      phone: '9876543210',
      notifyViaSms: true,
      notifyViaEmail: false,
    })
    assert.ok(issues?.some((i) => i.field === 'name'))
  })

  it('rejects an invalid Indian phone number', () => {
    const { issues } = validateContactCreate({
      name: 'Priya Rao',
      phone: '123456',
      notifyViaSms: true,
      notifyViaEmail: false,
    })
    assert.ok(issues?.some((i) => i.field === 'phone'))
  })

  it('rejects non-boolean alert flags', () => {
    const { issues } = validateContactCreate({
      name: 'Priya Rao',
      phone: '9876543210',
      notifyViaSms: 'yes',
      notifyViaEmail: false,
    })
    assert.ok(issues?.some((i) => i.field === 'notifyViaSms'))
  })
})

describe('emergency contact update validator', () => {
  it('rejects an empty update (no fields provided)', () => {
    const { issues } = validateContactUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('accepts a partial phone update and normalizes it', () => {
    const { input } = validateContactUpdate({ phone: '+91 90000 11111' })
    assert.equal(input?.phone, '+919000011111')
  })

  it('accepts clearing an optional email with an empty string', () => {
    const { input, issues } = validateContactUpdate({ email: '' })
    assert.equal(issues, undefined)
    assert.equal(input?.email, undefined)
  })
})

describe('isValidObjectId', () => {
  it('accepts a valid ObjectId and rejects malformed ids', () => {
    assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true)
    assert.equal(isValidObjectId('507f1f77'), false)
    assert.equal(isValidObjectId('123'), false)
    assert.equal(isValidObjectId(null), false)
  })
})