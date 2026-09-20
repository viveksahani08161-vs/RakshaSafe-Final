import { TtlCache, coordsCacheKey } from '../utils/geo.js'

export interface ReverseAddress {
  displayName: string | null
  road?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

const REVERSE_BASE = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT = 'RakshaSafe/1.0 (contact@rakshasafe.local)'
const TIMEOUT_MS = 8000
/** Minimum gap between upstream Nominatim calls (usage policy). */
const MIN_INTERVAL_MS = 1100
const CACHE_TTL_MS = 60 * 60 * 1000

const cache = new TtlCache<ReverseAddress | null>(CACHE_TTL_MS, 500)
let chain: Promise<void> = Promise.resolve()
let lastCallAt = 0

/** Serialize upstream calls so public Nominatim is never hammered. */
async function gate(): Promise<void> {
  const previous = chain
  let release!: () => void
  chain = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCallAt = Date.now()
  } finally {
    release()
  }
}

function textOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export interface ReverseGeocodeOptions {
  baseUrl?: string
  timeoutMs?: number
}

/**
 * Reverse-geocode WGS84 coordinates via Nominatim (server-side only).
 * Returns null on any failure — callers keep latitude/longitude and show
 * "unavailable" states. Nothing is fabricated; only fields Nominatim
 * actually returns are exposed. No API key exists for this service.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  options: ReverseGeocodeOptions = {},
): Promise<ReverseAddress | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const key = coordsCacheKey(latitude, longitude)
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const baseUrl = options.baseUrl ?? REVERSE_BASE
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS
  await gate()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
      addressdetails: '1',
      'accept-language': 'en',
      zoom: '16',
    })
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) {
      cache.set(key, null)
      return null
    }
    const data = (await res.json()) as {
      display_name?: string
      address?: Record<string, string>
    };
    const address = data.address ?? {}
    const out: ReverseAddress = {
      displayName: textOrUndefined(data.display_name) ?? null,
      road: textOrUndefined(address.road),
      neighbourhood: textOrUndefined(address.neighbourhood ?? address.suburb ?? address.quarter ?? address.village),
      suburb: textOrUndefined(address.suburb),
      city: textOrUndefined(address.city ?? address.town ?? address.district ?? address.county),
      state: textOrUndefined(address.state),
      postcode: textOrUndefined(address.postcode),
      country: textOrUndefined(address.country),
    }
    if (!out.displayName && !out.road && !out.city && !out.state && !out.country) {
      cache.set(key, null)
      return null
    }
    cache.set(key, out)
    return out
  } catch {
    cache.set(key, null)
    return null
  } finally {
    clearTimeout(timer)
  }
}
