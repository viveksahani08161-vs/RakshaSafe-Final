import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { searchOsmNearby, type OsmFacility, type OsmSearchOutcome } from '../services/osmPlaces.js'
import { haversineKm } from '../utils/geo.js'
import { badRequest } from '../utils/errors.js'
import { validateNearbyQuery } from '../validators/nearby.js'
import type { NearbyResource } from '../services/nearbyResources.js'

const router = Router()

/**
 * Authenticated, database-independent enrichment lookup.
 * requireDb is deliberately absent: nearby mapped data must stay
 * available even when MongoDB is unreachable.
 */
router.use(requireAuth)

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

const OSM_LABELS: Record<OsmFacility['category'], string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  police: 'Police Station',
  fire_station: 'Fire Station',
  ambulance_station: 'Ambulance Station',
  shelter: 'Shelter',
}

function toNearbyResource(
  item: OsmFacility,
  originLatitude: number,
  originLongitude: number,
): NearbyResource | null {
  if (item.latitude === null || item.longitude === null) return null
  const rawKm = haversineKm(originLatitude, originLongitude, item.latitude, item.longitude)
  return {
    id: `osm:${item.osmId}`,
    source: 'OSM',
    kind: 'facility',
    name: item.name,
    category: item.category,
    resourceType: OSM_LABELS[item.category],
    phone: item.phone,
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    distanceKm: Math.round(rawKm * 100) / 100,
    mapsUrl: null,
    ...(item.openingHours ? { operatingHours: item.openingHours } : {}),
  }
}

/** Progressive search: start tight, widen only when the smaller radius finds nothing. */
const DEFAULT_RADIUS_STEPS_M = [1000, 2500, 5000] as const

/**
 * GET /api/nearby?lat=&lng=&radiusKm=
 * Real mapped emergency facilities around valid coordinates via Overpass.
 * radiusKm is optional (1..5). When omitted, a progressive radius search
 * runs — 1 km, then 2.5 km, then 5 km — stopping at the first radius that
 * yields usable results. A caller-supplied radius is searched once, with a
 * single controlled retry at 5 km only when it finds nothing useful.
 * OSM records are discovery results only and are never stored.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { input, issues } = validateNearbyQuery(req.query)
    if (!input || issues) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
      })
    }
    const requestedKm = req.query.radiusKm === undefined ? null : Number(req.query.radiusKm)
    let outcome: OsmSearchOutcome = { facilities: [], status: 'ok' }
    const searchedRadii: number[] = []
    if (requestedKm === null) {
      for (const stepM of DEFAULT_RADIUS_STEPS_M) {
        const stepOutcome = await searchOsmNearby(input.latitude, input.longitude, stepM)
        searchedRadii.push(stepM)
        outcome = stepOutcome
        if (stepOutcome.status === 'error' || stepOutcome.facilities.length > 0) break
      }
    } else {
      if (!Number.isFinite(requestedKm) || requestedKm < 1 || requestedKm > 5) {
        return res.status(400).json({
          success: false,
          error: 'Radius must be between 1 and 5 km.',
        })
      }
      const radiusM = Math.round(requestedKm * 1000)
      searchedRadii.push(radiusM)
      outcome = await searchOsmNearby(input.latitude, input.longitude, radiusM)
      if (outcome.status === 'ok' && outcome.facilities.length === 0 && radiusM < 5000) {
        searchedRadii.push(5000)
        outcome = await searchOsmNearby(input.latitude, input.longitude, 5000)
      }
    }
    if (outcome.status === 'error') {
      return res.status(502).json({
        success: false,
        error: 'Nearby lookup is temporarily unavailable. Please try again later.',
      })
    }
    const maxRadiusM = Math.max(...searchedRadii)
    const resources: NearbyResource[] = []
    for (const item of outcome.facilities) {
      const mapped = toNearbyResource(item, input.latitude, input.longitude)
      if (mapped && mapped.distanceKm !== null && mapped.distanceKm <= maxRadiusM / 1000) {
        resources.push(mapped)
      }
    }
    resources.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    return res.json({ success: true, data: { facilities: resources, radiusM: maxRadiusM, searchedRadii } })
  }),
)

export default router
