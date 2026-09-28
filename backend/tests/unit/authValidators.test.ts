import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  isEmail,
  isPhone,
} from '../../src/validators/auth.js'

describe('register validator', () => {
  it('accepts a valid registration payload', () => {
    const { input, issues } = validateRegister({
      name: 'Test User',
      email: 'UNIT.test@example.com',
      phone: '9876543210',
      password: 'Password@123',
    })
    assert.equal(issues, undefined)
    assert.equal(input?.email, 'unit.test@example.com')
    assert.equal(input?.name, 'Test User')
  })

  it('rejects a missing name', () => {
    const { issues } = validateRegister({
      email: 'test@example.com',
      phone: '9876543210',
      password: 'Password@123',
    })
    assert.ok(issues?.some((i) => i.field === 'name'))
  })

  it('rejects a malformed email and an invalid phone', () => {
    const { issues } = validateRegister({
      name: 'Test User',
      email: 'not-an-email',
      phone: '123',
      password: 'Password@123',
    })
    assert.ok(issues?.some((i) => i.field === 'email'))
    assert.ok(issues?.some((i) => i.field === 'phone'))
  })

  it('rejects a password shorter than 8 characters', () => {
    const { issues } = validateRegister({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'short',
    })
    assert.ok(issues?.some((i) => i.field === 'password'))
  })
})

describe('login validator', () => {
  it('accepts email or phone as identifier', () => {
    assert.equal(validateLogin({ identifier: 'test@example.com', password: 'x' }).input?.identifier, 'test@example.com')
    assert.equal(validateLogin({ identifier: '9876543210', password: 'x' }).input?.identifier, '9876543210')
  })

  it('requires an identifier and a password', () => {
    const { issues } = validateLogin({ identifier: '', password: '' })
    assert.ok(issues?.some((i) => i.field === 'identifier'))
    assert.ok(issues?.some((i) => i.field === 'password'))
  })
})

describe('profile update validator', () => {
  it('needs at least one field', () => {
    const { issues } = validateProfileUpdate({})
    assert.ok(issues?.some((i) => i.field === 'body'))
  })

  it('trims and accepts a name update', () => {
    const { input } = validateProfileUpdate({ name: '  New Name  ' })
    assert.equal(input?.name, 'New Name')
  })
})

describe('isEmail / isPhone helpers', () => {
  it('isEmail accepts simple valid addresses and rejects invalid ones', () => {
    assert.equal(isEmail('a@b.co'), true)
    assert.equal(isEmail('a b@c.com'), false)
  })

  it('isPhone accepts indian-format input and rejects garbage', () => {
    assert.equal(isPhone('9876543210'), true)
    assert.equal(isPhone('+91 98765 43210'), true)
    assert.equal(isPhone('hello'), false)
  })
})