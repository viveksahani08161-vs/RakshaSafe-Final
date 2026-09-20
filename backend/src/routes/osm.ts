import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { searchOsmNearby, type OsmFacility } from '../services/osmPlaces.js'
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

/**
 * GET /api/nearby?lat=&lng=&radiusKm=
 * Real mapped emergency facilities around valid coordinates via Overpass.
 * radiusKm is optional (default 2, clamped to 1..5). When the first radius
 * yields nothing useful, one controlled retry at 5 km follows — never more.
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
    let radiusM = 2000
    if (req.query.radiusKm !== undefined) {
      const parsed = Number(req.query.radiusKm)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
        return res.status(400).json({
          success: false,
          error: 'Radius must be between 1 and 5 km.',
        })
      }
      radiusM = Math.round(parsed * 1000)
    }

    const searchedRadii: number[] = [radiusM]
    let outcome = await searchOsmNearby(input.latitude, input.longitude, radiusM)
    if (outcome.status !== 'error' && outcome.facilities.length === 0 && radiusM < 5000) {
      searchedRadii.push(5000)
      outcome = await searchOsmNearby(input.latitude, input.longitude, 5000)
    }
    if (outcome.status === 'error') {
      return res.status(502).json({
        success: false,
        error: 'Nearby lookup is temporarily unavailable. Please try again later.',
      })
    }
    const resources: NearbyResource[] = []
    for (const item of outcome.facilities) {
      const mapped = toNearbyResource(item, input.latitude, input.longitude)
      if (mapped && mapped.distanceKm !== null && mapped.distanceKm <= radiusM / 1000) {
        resources.push(mapped)
      }
    }
    resources.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    return res.json({ success: true, data: { facilities: resources, radiusM, searchedRadii } })
  }),
)

export default router
