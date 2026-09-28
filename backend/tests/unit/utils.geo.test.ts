import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { haversineKm, roundCoord, coordsCacheKey, TtlCache } from '../../src/utils/geo.js'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    assert.equal(haversineKm(28.61, 77.2, 28.61, 77.2), 0)
  })

  it('is symmetric', () => {
    const a = haversineKm(28.61, 77.2, 19.076, 72.8777)
    const b = haversineKm(19.076, 72.8777, 28.61, 77.2)
    assert.ok(a > 1000)
    assert.ok(a < 1300)
    assert.ok(Math.abs(a - b) < 1e-6)
  })
})

describe('roundCoord', () => {
  it('rounds to three decimal places by default', () => {
    assert.equal(roundCoord(28.6123456), 28.612)
    assert.equal(roundCoord(77.209678), 77.21)
  })

  it('rounds to a custom number of decimals', () => {
    assert.equal(roundCoord(28.6123456, 1), 28.6)
  })
})

describe('coordsCacheKey', () => {
  it('produces a stable, fixed-width key', () => {
    assert.equal(coordsCacheKey(28.61, 77.2), '28.610,77.200')
    assert.equal(coordsCacheKey(28.61235, 77.2096), '28.612,77.210')
  })
})

describe('TtlCache', () => {
  it('returns a value within its TTL', () => {
    const cache = new TtlCache<string>(1000)
    cache.set('k', 'v')
    assert.equal(cache.get('k'), 'v')
  })

  it('treats an expired entry as a miss', async () => {
    const cache = new TtlCache<string>(1)
    cache.set('k', 'v')
    await new Promise((resolve) => setTimeout(resolve, 15))
    assert.equal(cache.get('k'), undefined)
  })

  it('evicts the oldest entry once capacity is reached', () => {
    const cache = new TtlCache<string>(1000, 2)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    assert.equal(cache.get('a'), undefined)
    assert.equal(cache.get('b'), '2')
    assert.equal(cache.get('c'), '3')
  })
})