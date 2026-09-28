import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateInlineLocation } from '../../src/validators/location.js'
import type { ValidationIssue } from '../../src/validators/auth.js'

function collect(value: unknown): { result?: ReturnType<typeof validateInlineLocation>; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const result = validateInlineLocation(value, issues)
  return { result, issues }
}

describe('validateInlineLocation', () => {
  it('returns undefined for an absent location without issues', () => {
    const { result, issues } = collect(undefined)
    assert.equal(result, undefined)
    assert.equal(issues.length, 0)
  })

  it('accepts valid coordinates and optional text fields', () => {
    const { result, issues } = collect({
      latitude: 28.6139,
      longitude: 77.209,
      address: ' Connaught Place ',
      city: 'New Delhi',
      accuracy: 9.5,
    })
    assert.equal(issues.length, 0)
    assert.equal(result?.latitude, 28.6139)
    assert.equal(result?.longitude, 77.209)
    assert.equal(result?.address, 'Connaught Place')
    assert.equal(result?.accuracy, 9.5)
  })

  it('rejects latitude outside [-90, 90]', () => {
    const { result, issues } = collect({ latitude: 91, longitude: 0 })
    assert.equal(result, undefined)
    assert.ok(issues.some((i) => i.field === 'location.latitude'))
  })

  it('rejects longitude outside [-180, 180]', () => {
    const { result, issues } = collect({ latitude: 0, longitude: 180.5 })
    assert.equal(result, undefined)
    assert.ok(issues.some((i) => i.field === 'location.longitude'))
  })

  it('rejects a non-numeric or negative accuracy', () => {
    const { issues } = collect({ latitude: 0, longitude: 0, accuracy: -1 })
    assert.ok(issues.some((i) => i.field === 'location.accuracy'))
  })

  it('rejects an address longer than 200 characters', () => {
    const { result, issues } = collect({ latitude: 0, longitude: 0, address: 'x'.repeat(201) })
    assert.equal(result, undefined)
    assert.ok(issues.some((i) => i.field === 'location.address'))
  })

  it('treats a bogus structure as empty and reports missing coordinates', () => {
    const { result, issues } = collect('28.61,77.20')
    assert.equal(result, undefined)
    assert.ok(issues.some((i) => i.field === 'location.latitude'))
    assert.ok(issues.some((i) => i.field === 'location.longitude'))
  })
})