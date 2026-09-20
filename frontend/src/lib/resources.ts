import { api } from './api'
import type { IncidentLocation } from './incidents'

export interface Facility {
  id: string
  name: string
  facilityType: string
  locationId: string
  location: IncidentLocation | null
  phone: string
  capacity?: number
  isOperational: boolean
  operatingHours?: string
  createdAt: string
  updatedAt: string
}

export interface RescueTeam {
  id: string
  name: string
  teamType: string
  phone: string
  email?: string
  isActive: boolean
  specializations: string[]
  members: string[]
  locationId?: string
  location: IncidentLocation | null
  createdAt: string
  updatedAt: string
}

export const FACILITY_TYPES = ['Hospital', 'Shelter', 'Police Station', 'Fire Station', 'Relief Centre']

export const TEAM_TYPES = ['Police', 'Medical', 'Fire', 'Volunteer', 'NGO']

export function formatCoords(latitude: number, longitude: number, accuracy?: number): string {
  const base = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  return accuracy !== undefined ? `${base} (±${Math.round(accuracy)} m)` : base
}

/** Default nearby search radius in kilometres. */
export const DEFAULT_NEARBY_RADIUS_KM = 25

/**
 * One stored emergency resource with an honest distance.
 * distanceKm is null when the record has no stored coordinates —
 * never 0, never guessed.
 */
export type NearbyResourceSource = 'RAKSHASAFE' | 'GOOGLE_PLACES' | 'OSM'

export interface NearbyResource {
  id: string
  source: NearbyResourceSource
  kind: 'facility' | 'team'
  name: string
  resourceType: string
  phone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  distanceKm: number | null
  mapsUrl: string | null
  website?: string
  isOperational?: boolean
  isActive?: boolean
  operatingHours?: string
  capacity?: number
  specializations?: string[]
}

export interface NearbyExternalState {
  enabled: boolean
  status: 'ok' | 'error'
}

export interface NearbyResponse {
  resources: NearbyResource[]
  hasLocation?: boolean
  external?: NearbyExternalState
}

function nearbyQuery(latitude: number, longitude: number, radiusKm: number): string {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radiusKm: String(radiusKm),
  })
  return params.toString()
}

/** GET /api/nearby-resources — general lookup around live GPS coordinates. */
export async function getNearbyResources(
  latitude: number,
  longitude: number,
  radiusKm: number = DEFAULT_NEARBY_RADIUS_KM,
  signal?: AbortSignal,
): Promise<NearbyResource[]> {
  const res = await getNearbyEnvelope(latitude, longitude, radiusKm, signal)
  return res.resources
}

/** Same lookup including the external-provider state for honest UI notices. */
export async function getNearbyEnvelope(
  latitude: number,
  longitude: number,
  radiusKm: number = DEFAULT_NEARBY_RADIUS_KM,
  signal?: AbortSignal,
): Promise<NearbyResponse> {
  return api<NearbyResponse>(
    `/nearby-resources?${nearbyQuery(latitude, longitude, radiusKm)}`,
    signal ? { signal } : {},
  )
}

/** GET /api/incidents/:id/nearby-resources — owner-scoped, incident's stored location. */
export async function getIncidentNearbyResources(
  incidentId: string,
  signal?: AbortSignal,
): Promise<NearbyResponse> {
  return api<NearbyResponse>(`/incidents/${incidentId}/nearby-resources`, signal ? { signal } : {})
}

/** GET /api/admin/incidents/:id/nearby-resources — admin-scoped, incident's stored location. */
export async function getAdminIncidentNearbyResources(
  incidentId: string,
  signal?: AbortSignal,
): Promise<NearbyResponse> {
  return api<NearbyResponse>(`/admin/incidents/${incidentId}/nearby-resources`, signal ? { signal } : {})
}

/** Browser dialer link for a real stored phone number. No backend call is made. */
export function buildTelHref(phone: string): string {
  return `tel:${phone}`
}

/**
 * OpenStreetMap-compatible navigation link to real coordinates.
 * No API key, no billing — a plain shareable directions URL.
 * Returns null when coordinates are missing — callers must hide Directions then.
 */
export function buildDirectionsUrl(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return `https://www.openstreetmap.org/directions?to=${latitude},${longitude}`
}

/**
 * Preferred navigation link for a resource: the provider's own maps URL
 * when supplied, otherwise a directions URL built from valid coordinates,
 * otherwise null (Directions must be hidden then).
 */
export function buildResourceDirectionsUrl(resource: NearbyResource): string | null {
  if (resource.mapsUrl && resource.mapsUrl.trim() !== '') return resource.mapsUrl
  return buildDirectionsUrl(resource.latitude, resource.longitude)
}

export interface OsmNearbyResponse {
  facilities: NearbyResource[]
}

/** GET /api/nearby — real mapped facilities (Overpass) around valid coordinates. */
export async function getOsmNearby(
  latitude: number,
  longitude: number,
  radiusKm?: number,
  signal?: AbortSignal,
): Promise<OsmNearbyResponse> {
  const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) })
  if (radiusKm !== undefined) params.set('radiusKm', String(radiusKm))
  return api<OsmNearbyResponse>(`/nearby?${params.toString()}`, signal ? { signal } : {})
}

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

/** GET /api/geocode/reverse — readable address for valid coordinates, or null. */
export async function getReverseAddress(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseAddress | null> {
  const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) })
  const res = await api<{ address: ReverseAddress | null }>(
    `/geocode/reverse?${params.toString()}`,
    signal ? { signal } : {},
  )
  return res.address
}

/**
 * Honest distance presentation: meters below 1 km, kilometres above.
 * Returns null when there is no valid distance — never a guess.
 */
export function describeDistance(distanceKm: number | null): { unit: 'm' | 'km'; value: number } | null {
  if (distanceKm === null || !Number.isFinite(distanceKm) || distanceKm < 0) return null
  if (distanceKm < 1) return { unit: 'm', value: Math.max(1, Math.round(distanceKm * 1000)) }
  return { unit: 'km', value: Math.round(distanceKm * 10) / 10 }
}
