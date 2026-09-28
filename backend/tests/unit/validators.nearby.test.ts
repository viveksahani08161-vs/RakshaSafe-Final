import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateNearbyQuery,
  validateRadiusKm,
  DEFAULT_NEARBY_RADIUS_KM,
  MAX_NEARBY_RADIUS_KM,
} from '../../src/validators/nearby.js'

describe('validateNearbyQuery', () => {
  it('accepts numeric-string coordinates and a radius', () => {
    const { input, issues } = validateNearbyQuery({ lat: '28.6', lon: '77.2', radiusKm: '50' })
    assert.equal(issues, undefined)
    assert.deepEqual(input, { latitude: 28.6, longitude: 77.2, radiusKm: 50 })
  })

  it('accepts alternative latitude/longitude spellings', () => {
    const { input, issues } = validateNearbyQuery({ latitude: 28.6, lon: 77.2 })
    assert.equal(issues, undefined)
    assert.equal(input?.latitude, 28.6)
    assert.equal(input?.longitude, 77.2)
  })

  it('applies the default radius when omitted', () => {
    const { input, issues } = validateNearbyQuery({ lat: 28.6, lon: 77.2 })
    assert.equal(issues, undefined)
    assert.equal(input?.radiusKm, DEFAULT_NEARBY_RADIUS_KM)
  })

  it('respects a provided default radius override', () => {
    const { input, issues } = validateNearbyQuery({ lat: 28.6, lon: 77.2 }, 40)
    assert.equal(issues, undefined)
    assert.equal(input?.radiusKm, 40)
  })

  it('rejects missing or out-of-range latitude', () => {
    assert.ok(validateNearbyQuery({ lon: 77.2 }).issues?.some((i) => i.field === 'lat'))
    assert.ok(validateNearbyQuery({ lat: 120, lon: 77.2 }).issues?.some((i) => i.field === 'lat'))
    assert.ok(validateNearbyQuery({ lat: 'abc', lon: 77.2 }).issues?.some((i) => i.field === 'lat'))
  })

  it('rejects missing or out-of-range longitude', () => {
    assert.ok(validateNearbyQuery({ lat: 28.6 }).issues?.some((i) => i.field === 'lng'))
    assert.ok(validateNearbyQuery({ lat: 28.6, lon: -200 }).issues?.some((i) => i.field === 'lng'))
  })

  it('rejects a zero, negative, or over-limit radius, never clamping', () => {
    assert.ok(validateNearbyQuery({ lat: 28.6, lon: 77.2, radiusKm: 0 }).issues?.some((i) => i.field === 'radiusKm'))
    assert.ok(validateNearbyQuery({ lat: 28.6, lon: 77.2, radiusKm: -5 }).issues?.some((i) => i.field === 'radiusKm'))
    assert.ok(
      validateNearbyQuery({ lat: 28.6, lon: 77.2, radiusKm: MAX_NEARBY_RADIUS_KM + 1 }).issues?.some(
        (i) => i.field === 'radiusKm',
      ),
    )
  })

  it('reports issues (not defaults) when coordinates are bad', () => {
    const { input, issues } = validateNearbyQuery({})
    assert.equal(input, undefined)
    assert.ok(issues?.length && issues.length >= 2)
  })
})

describe('validateRadiusKm', () => {
  it('defaults when omitted', () => {
    assert.deepEqual(validateRadiusKm(undefined), { radiusKm: DEFAULT_NEARBY_RADIUS_KM })
  })

  it('parses numeric strings', () => {
    assert.deepEqual(validateRadiusKm('70'), { radiusKm: 70 })
  })

  it('reports an issue for out-of-range values', () => {
    assert.ok(validateRadiusKm(200).issue)
    assert.ok(validateRadiusKm(-1).issue)
    assert.ok(validateRadiusKm('abc').issue)
  })
})