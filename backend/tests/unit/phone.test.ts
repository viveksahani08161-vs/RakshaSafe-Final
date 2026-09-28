import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeIndianPhone,
  isValidIndianPhone,
  formatPhoneForDisplay,
} from '../../src/utils/phone.js'

describe('normalizeIndianPhone', () => {
  it('normalizes a plain 10-digit Indian mobile number', () => {
    assert.equal(normalizeIndianPhone('9876543210'), '+919876543210')
  })

  it('keeps an already-prefixed +91 number', () => {
    assert.equal(normalizeIndianPhone('+919876543210'), '+919876543210')
  })

  it('accepts a 12-digit 91-prefixed number (without +)', () => {
    assert.equal(normalizeIndianPhone('919876543210'), '+919876543210')
  })

  it('does not treat a 10-digit number starting with 91 as prefixed', () => {
    assert.equal(normalizeIndianPhone('9136787194'), '+919136787194')
  })

  it('trims surrounding whitespace', () => {
    assert.equal(normalizeIndianPhone('  +91 98765 43210  '), '+919876543210')
  })

  it('strips common punctuation (dashes, spaces)', () => {
    assert.equal(normalizeIndianPhone('98765-43210'), '+919876543210')
  })

  it('rejects too-short input', () => {
    assert.equal(normalizeIndianPhone('987'), null)
  })

  it('rejects a number that does not start with a valid mobile prefix (6-9)', () => {
    assert.equal(normalizeIndianPhone('0123456789'), null)
    assert.equal(normalizeIndianPhone('5987654321'), null)
  })

  it('rejects non-digit garbage', () => {
    assert.equal(normalizeIndianPhone('abc'), null)
  })
})

describe('isValidIndianPhone', () => {
  it('returns true for a valid mobile number with spaces', () => {
    assert.equal(isValidIndianPhone('+91 98765 43210'), true)
  })

  it('returns false for an invalid number', () => {
    assert.equal(isValidIndianPhone('1234567890'), false)
    assert.equal(isValidIndianPhone(''), false)
  })
})

describe('formatPhoneForDisplay', () => {
  it('formats a normalized number for display', () => {
    assert.equal(formatPhoneForDisplay('+919876543210'), '+91 98765 43210')
  })

  it('returns the original value when the input cannot be parsed', () => {
    assert.equal(formatPhoneForDisplay('not-a-number'), 'not-a-number')
  })
})