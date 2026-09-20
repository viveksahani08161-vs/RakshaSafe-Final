/**
 * Shared geographic helpers for backend location services.
 * Pure functions only — no I/O, no secrets, no side effects.
 */

/** Great-circle distance in kilometres between two WGS84 points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180
  const earthKm = 6371
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return 2 * earthKm * Math.asin(Math.sqrt(a))
}

/** Round a coordinate for cache keys so near-identical requests share entries. */
export function roundCoord(value: number, decimals = 3): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Stable cache key for a coordinate pair. Contains rounded numbers only. */
export function coordsCacheKey(latitude: number, longitude: number, decimals = 3): string {
  return `${roundCoord(latitude, decimals).toFixed(decimals)},${roundCoord(longitude, decimals).toFixed(decimals)}`
}

/** Tiny TTL map with FIFO eviction once over capacity. */
export class TtlCache<T> {
  private readonly store = new Map<string, { at: number; value: T }>()

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 200,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.at > this.ttlMs) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next()
      if (!oldest.done) this.store.delete(oldest.value)
    }
    this.store.set(key, { at: Date.now(), value })
  }
}
