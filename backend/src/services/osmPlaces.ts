import { TtlCache, coordsCacheKey, haversineKm } from '../utils/geo.js'

export type OsmCategory =
  | 'hospital'
  | 'clinic'
  | 'police'
  | 'fire_station'
  | 'ambulance_station'
  | 'shelter'

export interface OsmFacility {
  osmId: string
  osmKind: 'node' | 'way' | 'relation'
  name: string
  category: OsmCategory
  latitude: number | null
  longitude: number | null
  address: string | null
  phone: string | null
  website: string | null
  openingHours?: string
}

export interface OsmSearchOutcome {
  facilities: OsmFacility[]
  status: 'ok' | 'error'
  error?: string
}

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'RakshaSafe/1.0 (contact@rakshasafe.local)'
const TIMEOUT_MS = 20000
const CACHE_TTL_MS = 10 * 60 * 1000
const MAX_RESULTS = 15

const cache = new TtlCache<OsmFacility[]>(CACHE_TTL_MS, 200)
const inflight = new Map<string, Promise<OsmFacility[]>>()

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

interface OsmElement {
  type?: string
  id?: number
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Record<string, string>
}

function elementCoords(el: OsmElement): { latitude: number | null; longitude: number | null } {
  const lat = finiteOrNull(el.lat) ?? finiteOrNull(el.center?.lat)
  const lon = finiteOrNull(el.lon) ?? finiteOrNull(el.center?.lon)
  return { latitude: lat, longitude: lon }
}

function composeAddress(tags: Record<string, string>): string | null {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street'] ?? tags['addr:road']].filter(Boolean).join(' '),
    tags['addr:suburb'] ?? tags['addr:neighbourhood'] ?? tags['addr:quarter'],
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'],
    tags['addr:state'],
    tags['addr:postcode'],
    tags['addr:country'],
  ].filter((p) => typeof p === 'string' && p.trim() !== '')
  return parts.length > 0 ? parts.join(', ') : null
}

function mapElement(el: OsmElement): OsmFacility | null {
  const tags = el.tags ?? {}
  const name = textOrNull(tags.name)
  // Unnamed objects cannot be labelled honestly — skip them.
  if (!name) return null
  const amenity = textOrNull(tags.amenity)
  const emergency = textOrNull(tags.emergency)
  const category: OsmCategory | null =
    amenity === 'hospital' ||
    amenity === 'clinic' ||
    amenity === 'police' ||
    amenity === 'fire_station' ||
    amenity === 'shelter'
      ? (amenity as OsmCategory)
      // Ambulance stations are commonly tagged emergency=ambulance_station.
      : amenity === 'ambulance_station' || emergency === 'ambulance_station'
        ? 'ambulance_station'
        : null
  if (!category) return null
  const { latitude, longitude } = elementCoords(el)
  return {
    osmId: `${el.type ?? 'node'}/${el.id ?? 0}`,
    osmKind: el.type === 'way' || el.type === 'relation' ? el.type : 'node',
    name,
    category,
    latitude,
    longitude,
    address: composeAddress(tags),
    phone: textOrNull(tags.phone ?? tags['contact:phone']),
    website: textOrNull(tags.website ?? tags['contact:website']),
    ...(textOrNull(tags.opening_hours) ? { openingHours: textOrNull(tags.opening_hours) as string } : {}),
  }
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Conservative same-place rule for Overpass duplicates (e.g. a hospital
 * returned as both node and way): identical normalized names within 50 m.
 * Different names are never merged.
 */
export function dedupeOsmFacilities(items: OsmFacility[]): OsmFacility[] {
  const kept: OsmFacility[] = []
  for (const item of items) {
    const dup = kept.some(
      (k) =>
        normalizeName(k.name) === normalizeName(item.name) &&
        k.latitude !== null &&
        k.longitude !== null &&
        item.latitude !== null &&
        item.longitude !== null &&
        haversineKm(k.latitude, k.longitude, item.latitude, item.longitude) < 0.05,
    )
    if (!dup) kept.push(item)
  }
  return kept
}

function buildQuery(latitude: number, longitude: number, radiusM: number): string {
  const around = `around:${Math.round(radiusM)},${latitude},${longitude}`
  // One OR-matcher, not chained ANDs: chained ["amenity"="x"]["amenity"="y"]
  // filters would require a single element to be BOTH at once (never true).
  const amenitySelector = '["amenity"~"^(hospital|clinic|police|fire_station|ambulance_station|shelter)$"]'
  const emergencySelector = '["emergency"="ambulance_station"]'
  const clauses = ['node', 'way', 'relation']
    .map((kind) => `${kind}${amenitySelector}(${around});`)
    .concat(['node', 'way', 'relation'].map((kind) => `${kind}${emergencySelector}(${around});`))
    .join('')
  return `[out:json][timeout:20];(${clauses});out center ${MAX_RESULTS};`
}

export interface OsmSearchOptions {
  baseUrl?: string
  timeoutMs?: number
}

/**
 * Search mapped emergency facilities around real coordinates via Overpass.
 * Returns real OSM records only — no invented names, phones, addresses,
 * availability, or ETAs. Failures yield { status: 'error' }; callers show
 * "unavailable" states and never fabricate fallback data.
 */
export async function searchOsmNearby(
  latitude: number,
  longitude: number,
  radiusM: number,
  options: OsmSearchOptions = {},
): Promise<OsmSearchOutcome> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusM) ||
    radiusM <= 0
  ) {
    return { facilities: [], status: 'error', error: 'Invalid search area.' }
  }
  const key = `${coordsCacheKey(latitude, longitude)}:${Math.round(radiusM)}`
  const cached = cache.get(key)
  if (cached !== undefined) return { facilities: cached, status: 'ok' }
  const pending = inflight.get(key)
  if (pending) {
    const facilities = await pending
    return { facilities, status: 'ok' }
  }

  const baseUrl = options.baseUrl ?? OVERPASS_BASE
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS
  const task = (async (): Promise<{ facilities: OsmFacility[]; ok: boolean }> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(buildQuery(latitude, longitude, radiusM))}`,
        signal: controller.signal,
      })
      if (!res.ok) return { facilities: [], ok: false }
      const data = (await res.json()) as { elements?: OsmElement[] };
      const mapped: OsmFacility[] = []
      for (const el of data.elements ?? []) {
        const item = mapElement(el)
        if (item) mapped.push(item)
      }
      const deduped = dedupeOsmFacilities(mapped)
      cache.set(key, deduped)
      return { facilities: deduped, ok: true }
    } catch {
      // Timeout, abort, network failure, or unreadable body: error, never fake data.
      return { facilities: [], ok: false }
    } finally {
      clearTimeout(timer)
      inflight.delete(key)
    }
  })()
  inflight.set(
    key,
    task.then((r) => r.facilities),
  )
  const result = await task
  if (!result.ok) return { facilities: [], status: 'error', error: 'Nearby lookup is unavailable.' }
  return { facilities: result.facilities, status: 'ok' }
}
