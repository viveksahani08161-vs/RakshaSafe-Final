/**
 * Shared shapes for external nearby-places providers.
 * Providers run backend-side only and never persist anything:
 * results are ephemeral discovery data, never stored as Facilities.
 */

export type ExternalPlaceSource = 'GOOGLE_PLACES'

/** One normalized place from an external provider. Missing data stays null. */
export interface ExternalPlace {
  placeId: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  businessStatus: string | null
  mapsUri: string | null
  /** Provider category, e.g. 'hospital' | 'police' | 'fire_station'. */
  category: string
}

export type ExternalQueryStatus = 'ok' | 'error'

export interface ProviderSearchResult {
  places: ExternalPlace[]
  status: ExternalQueryStatus
  /** Safe message only — never credentials, keys, or coordinates. */
  error?: string
}

export interface NearbyProvider {
  name: string
  isEnabled(): boolean
}
