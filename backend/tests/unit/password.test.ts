import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, comparePassword } from '../../src/utils/password.js'

describe('password hashing (bcrypt)', () => {
  it('produces a hash that verifies against the plain-text password', async () => {
    const hash = await hashPassword('Raksha#Secure8')
    assert.notEqual(hash, 'Raksha#Secure8')
    assert.equal(await comparePassword('Raksha#Secure8', hash), true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Raksha#Secure8')
    assert.equal(await comparePassword('wrong-password', hash), false)
  })

  it('never stores the plain-text password and salts each hash', async () => {
    const a = await hashPassword('SamePassword1')
    const b = await hashPassword('SamePassword1')
    assert.notEqual(a, b) // bcrypt salts -> identical input still differs
    assert.ok(!a.includes('SamePassword1'))
  })
})