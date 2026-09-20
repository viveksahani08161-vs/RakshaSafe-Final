import { toSafeLocation } from '../controllers/incidentController.js'
import { Facility } from '../models/Facility.js'
import { Location } from '../models/Location.js'
import { RescueTeam } from '../models/RescueTeam.js'

/** Maximum resources returned by any nearby query. */
export const NEARBY_RESOURCE_LIMIT = 10

export type NearbyResourceSource = 'RAKSHASAFE' | 'GOOGLE_PLACES' | 'OSM'

export interface NearbyResource {
  id: string
  /** RAKSHASAFE = stored database record; GOOGLE_PLACES = ephemeral discovery result. */
  source: NearbyResourceSource
  kind: 'facility' | 'team'
  name: string
  resourceType: string
  /** Null when the provider/record supplies no phone — never fabricated. */
  phone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  /** Kilometres from the query point, 1-decimal. Null when the record has no stored coordinates. */
  distanceKm: number | null
  /** Provider-supplied navigation link, or null (clients build one from coordinates). */
  mapsUrl: string | null
  isOperational?: boolean
  isActive?: boolean
  operatingHours?: string
  capacity?: number
  specializations?: string[]
}

export interface NearbySearchOutcome {
  resources: NearbyResource[]
  external: {
    enabled: boolean
    status: 'ok' | 'error'
  }
}

/**
 * Great-circle distance in kilometres. Local pure copy of the documented
 * formula (riskAssessment.ts owns its own copy for the AI path; this module
 * must not change that engine).
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180
  const earthKm = 6371
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return 2 * earthKm * Math.asin(Math.sqrt(a))
}

/**
 * Compose a display address purely from stored location parts.
 * Returns null when nothing usable is stored — never a fabricated address.
 */
export function formatStoredAddress(loc: {
  address?: string
  city?: string
  state?: string
  country?: string
} | null): string | null {
  if (!loc) return null
  const parts = [loc.address, loc.city, loc.state, loc.country].filter(
    (p): p is string => typeof p === 'string' && p.trim() !== '',
  )
  return parts.length > 0 ? parts.join(', ') : null
}

/**
 * Order contract, shared by every nearby endpoint: valid distances
 * nearest-first (ties by name), records without coordinates last (by name).
 */
export function sortNearbyResources(items: NearbyResource[]): NearbyResource[] {
  return [...items].sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name)
    if (a.distanceKm === null) return 1
    if (b.distanceKm === null) return -1
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm
    return a.name.localeCompare(b.name)
  })
}

/**
 * Nearest emergency resources around a real query point.
 *
 * Source A — RakshaSafe database (always):
 * - operational Facilities that have a linked Locations record
 * - active RescueTeams, distanced only when the team has a stored
 *   Locations record; teams without one carry distanceKm: null and sort
 *   after distanced records
 *
 * Source B — external places provider (only when operator-enabled):
 * ephemeral discovery results merged in, deduplicated against Source A
 * (verified DB records win ties), never persisted as Facilities.
 *
 * Honesty rules enforced here, not in callers:
 * - out-of-radius located records are dropped, never shown with a fake distance
 * - records without coordinates get distanceKm: null (never 0, never guessed)
 * - no availability, ETA, beds, or dispatch state is invented
 * - at most NEARBY_RESOURCE_LIMIT records are returned
 * - external failure degrades to DB-only; it never throws
 */
export async function findNearbyResources(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<NearbySearchOutcome> {
  const [facilities, teams] = await Promise.all([
    Facility.find({ isOperational: true }).sort({ name: 1 }),
    RescueTeam.find({ isActive: true }).sort({ name: 1 }),
  ])

  const locationIds = [
    ...new Set([
      ...facilities.map((f) => String(f.locationId)),
      ...teams.map((t) => (t.locationId ? String(t.locationId) : '')).filter((s) => s !== ''),
    ]),
  ]
  const locs = locationIds.length > 0 ? await Location.find({ _id: { $in: locationIds } }) : []
  const locMap = new Map(locs.map((l) => [String(l._id), toSafeLocation(l)]))

  const out: NearbyResource[] = []

  for (const f of facilities) {
    const loc = locMap.get(String(f.locationId)) ?? null
    const rawKm = loc ? haversineKm(latitude, longitude, loc.latitude, loc.longitude) : null
    if (rawKm !== null && rawKm > radiusKm) continue
    out.push({
      id: String(f._id),
      source: 'RAKSHASAFE',
      kind: 'facility',
      name: f.name,
      resourceType: f.facilityType,
      phone: f.phone,
      address: formatStoredAddress(loc),
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      distanceKm: rawKm === null ? null : Math.round(rawKm * 10) / 10,
      mapsUrl: null,
      isOperational: f.isOperational,
      ...(f.operatingHours ? { operatingHours: f.operatingHours } : {}),
      ...(f.capacity !== undefined ? { capacity: f.capacity } : {}),
    })
  }

  for (const t of teams) {
    // Teams carry coordinates only when an admin stored a location.
    // Without one the team stays visible with distanceKm: null — never guessed.
    const loc = t.locationId ? (locMap.get(String(t.locationId)) ?? null) : null
    const rawKm = loc ? haversineKm(latitude, longitude, loc.latitude, loc.longitude) : null
    if (rawKm !== null && rawKm > radiusKm) continue
    out.push({
      id: String(t._id),
      source: 'RAKSHASAFE',
      kind: 'team',
      name: t.name,
      resourceType: t.teamType,
      phone: t.phone,
      address: formatStoredAddress(loc),
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      distanceKm: rawKm === null ? null : Math.round(rawKm * 10) / 10,
      mapsUrl: null,
      isActive: t.isActive,
      specializations: t.specializations ?? [],
    })
  }

  // Source B — external discovery, DB-only on any failure or when disabled.
  let external: NearbySearchOutcome['external'] = { enabled: false, status: 'ok' }
  try {
    const { searchExternalPlaces, dedupeExternalAgainstDb, normalizeExternalPlace } =
      await import('./nearbyProviders/index.js')
    const result = await searchExternalPlaces(latitude, longitude, radiusKm)
    if (result) {
      external = { enabled: true, status: result.status }
      if (result.status === 'ok') {
        const fresh = dedupeExternalAgainstDb(out, result.places).map((p) =>
          normalizeExternalPlace(p, latitude, longitude),
        )
        for (const item of fresh) {
          if (item.distanceKm !== null && item.distanceKm > radiusKm) continue
          out.push(item)
        }
      } else {
        // Safe log: status only — never keys, coordinates, or payloads.
        console.warn('[nearby-external] provider unavailable, serving database resources only.')
      }
    }
  } catch {
    external = { enabled: true, status: 'error' }
    console.warn('[nearby-external] provider failed, serving database resources only.')
  }

  return { resources: sortNearbyResources(out).slice(0, NEARBY_RESOURCE_LIMIT), external }
}
