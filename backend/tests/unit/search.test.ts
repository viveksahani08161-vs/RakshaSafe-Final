import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { escapeRegExp } from '../../src/utils/search.js'

describe('escapeRegExp', () => {
  it('escapes regex metacharacters so user input cannot alter a pattern', () => {
    const given = 'a.b*c?d+e[f]\\g'
    const escaped = escapeRegExp(given)
    assert.equal(escaped, 'a\\.b\\*c\\?d\\+e\\[f\\]\\\\g')
    // The escaped string must match literally, not as a pattern.
    assert.equal(new RegExp(`^${escaped}$`).test(given), true)
  })

  it('keeps plain text unchanged', () => {
    assert.equal(escapeRegExp('rk1 122-3333'), 'rk1 122-3333')
  })

  it('handles empty and whitespace input safely', () => {
    assert.equal(escapeRegExp(''), '')
    assert.equal(escapeRegExp('   '), '   ')
  })
})