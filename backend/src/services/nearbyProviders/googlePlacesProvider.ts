import type { ExternalPlace, ProviderSearchResult } from './types.js'

const DEFAULT_BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby'

/**
 * Minimal field mask: only what resource cards render. Requesting fewer
 * fields keeps responses small and avoids expensive SKU fields.
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.businessStatus',
  'places.googleMapsUri',
].join(',')

export const EXTERNAL_MAX_PER_CATEGORY = 10

export interface PlacesCategory {
  includedType: string
  resourceType: string
}

/** Categories searched, mapped to RakshaSafe display types. */
export const PLACES_CATEGORIES: PlacesCategory[] = [
  { includedType: 'hospital', resourceType: 'Hospital' },
  { includedType: 'police', resourceType: 'Police' },
  { includedType: 'fire_station', resourceType: 'Fire Station' },
]

interface PlacesApiPlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  nationalPhoneNumber?: string
  businessStatus?: string
  googleMapsUri?: string
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function mapPlace(raw: PlacesApiPlace, category: string): ExternalPlace | null {
  const placeId = textOrNull(raw.id)
  const name = textOrNull(raw.displayName?.text)
  if (!placeId || !name) return null
  return {
    placeId,
    name,
    address: textOrNull(raw.formattedAddress),
    latitude: finiteOrNull(raw.location?.latitude),
    longitude: finiteOrNull(raw.location?.longitude),
    phone: textOrNull(raw.nationalPhoneNumber),
    businessStatus: textOrNull(raw.businessStatus),
    mapsUri: textOrNull(raw.googleMapsUri),
    category,
  }
}

export interface GoogleSearchOptions {
  apiKey: string
  timeoutMs: number
  /** Override for tests — never used in production code paths. */
  baseUrl?: string
  /** Injectable fetch for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch
}

/**
 * Query Google Places API (New) Nearby Search, one request per category.
 * Never throws for provider-side problems: every failure mode returns
 * { places: [], status: 'error' } with a safe message so callers fall back
 * to RakshaSafe database resources. The key travels only in the request
 * header; it is never logged, never returned, never stored.
 */
export async function searchGooglePlaces(
  latitude: number,
  longitude: number,
  radiusM: number,
  options: GoogleSearchOptions,
): Promise<ProviderSearchResult> {
  const { apiKey, timeoutMs, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = options
  if (!apiKey) return { places: [], status: 'error', error: 'External provider is not configured.' }

  const out: ExternalPlace[] = []
  try {
    const results = await Promise.all(
      PLACES_CATEGORIES.map(async (cat) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        try {
          const res = await fetchImpl(baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': FIELD_MASK,
            },
            body: JSON.stringify({
              includedTypes: [cat.includedType],
              maxResultCount: EXTERNAL_MAX_PER_CATEGORY,
              locationRestriction: {
                circle: { center: { latitude, longitude }, radius: radiusM },
              },
              rankPreference: 'DISTANCE',
            }),
            signal: controller.signal,
          })
          if (!res.ok) {
            return { places: [] as ExternalPlace[], status: 'error' as const, code: res.status }
          }
          const data = (await res.json()) as { places?: PlacesApiPlace[] };
          const mapped: ExternalPlace[] = []
          for (const raw of data.places ?? []) {
            const place = mapPlace(raw, cat.includedType)
            if (place) mapped.push(place)
          }
          return { places: mapped, status: 'ok' as const, code: res.status }
        } finally {
          clearTimeout(timer)
        }
      }),
    )
    for (const r of results) {
      if (r.status === 'error') {
        return { places: [], status: 'error', error: `External provider responded ${r.code}.` }
      }
      out.push(...r.places)
    }
    return { places: out, status: 'ok' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { places: [], status: 'error', error: 'External provider timed out.' }
    }
    return { places: [], status: 'error', error: 'External provider is unreachable.' }
  }
}
