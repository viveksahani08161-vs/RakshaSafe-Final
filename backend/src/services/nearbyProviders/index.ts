import { env } from '../../config/env.js'
import { haversineKm, type NearbyResource } from '../nearbyResources.js'
import { searchGooglePlaces } from './googlePlacesProvider.js'
import type { ExternalPlace, ProviderSearchResult } from './types.js'

export type { ExternalPlace, ProviderSearchResult }

/** True only when the operator enabled the provider AND supplied a key. */
export function isExternalProviderEnabled(): boolean {
  return env.nearbyExternalEnabled && env.googlePlacesApiKey.trim() !== ''
}

/**
 * Run the enabled external provider. Returns null when disabled so callers
 * serve RakshaSafe database resources alone. Never throws: provider faults
 * arrive as { status: 'error' } and must trigger DB-only fallback upstream.
 */
export async function searchExternalPlaces(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<ProviderSearchResult | null> {
  if (!isExternalProviderEnabled()) return null
  const radiusM = Math.max(1, Math.min(50000, Math.round(radiusKm * 1000)))
  try {
    return await searchGooglePlaces(latitude, longitude, radiusM, {
      apiKey: env.googlePlacesApiKey,
      timeoutMs: env.nearbyExternalTimeoutMs,
    })
  } catch {
    return { places: [], status: 'error', error: 'External provider failed.' }
  }
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return digits === '' ? null : digits
}

/**
 * A DB record and an external place are the same real place only when the
 * names match after normalization AND (phones match by suffix OR both have
 * coordinates within ~100 m). Deliberately conservative: when in doubt the
 * external result is kept and the RakshaSafe verified record wins ties.
 */
export function isSamePlace(
  db: Pick<NearbyResource, 'name' | 'phone' | 'latitude' | 'longitude'>,
  ext: Pick<ExternalPlace, 'name' | 'phone' | 'latitude' | 'longitude'>,
): boolean {
  if (normalizeName(db.name) !== normalizeName(ext.name)) return false
  const dbPhone = normalizePhone(db.phone)
  const extPhone = normalizePhone(ext.phone)
  if (dbPhone && extPhone && (dbPhone.endsWith(extPhone) || extPhone.endsWith(dbPhone))) return true
  if (
    db.latitude !== null &&
    db.longitude !== null &&
    ext.latitude !== null &&
    ext.longitude !== null &&
    Number.isFinite(db.latitude) &&
    Number.isFinite(db.longitude) &&
    Number.isFinite(ext.latitude) &&
    Number.isFinite(ext.longitude)
  ) {
    return haversineKm(db.latitude, db.longitude, ext.latitude, ext.longitude) < 0.1
  }
  return false
}

/** Drop external places confidently matched to a RakshaSafe record. */
export function dedupeExternalAgainstDb(
  db: NearbyResource[],
  external: ExternalPlace[],
): ExternalPlace[] {
  return external.filter((ext) => !db.some((d) => isSamePlace(d, ext)))
}

/** Map an external category to a RakshaSafe display type. */
export function externalCategoryLabel(category: string): string {
  switch (category) {
    case 'hospital':
      return 'Hospital'
    case 'police':
      return 'Police'
    case 'fire_station':
      return 'Fire Station'
    default:
      return 'Emergency Service'
  }
}

/**
 * Normalize one external place into the shared resource shape.
 * Distance is Haversine from the real query point (the provider supplies
 * ranking, not routing distances). Anything unavailable stays null —
 * businessStatus maps only when explicitly OPERATIONAL/CLOSED.
 */
export function normalizeExternalPlace(
  place: ExternalPlace,
  originLatitude: number,
  originLongitude: number,
): Omit<NearbyResource, 'id'> & { id: string } {
  const hasCoords =
    place.latitude !== null &&
    place.longitude !== null &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  const rawKm = hasCoords
    ? haversineKm(originLatitude, originLongitude, place.latitude as number, place.longitude as number)
    : null
  const status = (place.businessStatus ?? '').toUpperCase()
  return {
    id: `google:${place.placeId}`,
    kind: 'facility',
    source: 'GOOGLE_PLACES',
    name: place.name,
    resourceType: externalCategoryLabel(place.category),
    phone: place.phone,
    address: place.address,
    latitude: hasCoords ? (place.latitude as number) : null,
    longitude: hasCoords ? (place.longitude as number) : null,
    distanceKm: rawKm === null ? null : Math.round(rawKm * 10) / 10,
    mapsUrl: place.mapsUri,
    isOperational: status === 'OPERATIONAL' ? true : status.startsWith('CLOSED') ? false : undefined,
  }
}
