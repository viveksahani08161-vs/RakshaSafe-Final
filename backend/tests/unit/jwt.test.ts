import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { signAuthToken, verifyAuthToken } from '../../src/utils/jwt.js'
import { UserRole } from '../../src/models/User.js'

const FAKE_USER_ID = '507f1f77bcf86cd799439011'

describe('JWT signing and verification', () => {
  it('signs a token that verifies back to the same id and role', () => {
    const token = signAuthToken(FAKE_USER_ID, UserRole.USER)
    const payload = verifyAuthToken(token)
    assert.ok(payload)
    assert.equal(payload!.sub, FAKE_USER_ID)
    assert.equal(payload!.role, UserRole.USER)
  })

  it('verifies an administrator token with the ADMIN role', () => {
    const token = signAuthToken(FAKE_USER_ID, UserRole.ADMIN)
    assert.equal(verifyAuthToken(token)?.role, UserRole.ADMIN)
  })

  it('rejects a token that has been tampered with', () => {
    const token = signAuthToken(FAKE_USER_ID, UserRole.USER)
    const tampered = `${token.slice(0, -4)}AAAA`
    assert.equal(verifyAuthToken(tampered), null)
  })

  it('rejects a garbage string that is not a token', () => {
    assert.equal(verifyAuthToken('not-a-jwt'), null)
  })
})