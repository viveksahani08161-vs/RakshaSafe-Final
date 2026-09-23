import { Router, Request, Response, NextFunction } from 'express'
import { reverseGeocode } from '../services/geocoding.js'
import { requireAuth } from '../middleware/auth.js'
import { validateNearbyQuery } from '../validators/nearby.js'

const router = Router()

// Geocoding hits a third-party upstream (Nominatim) — keep it authenticated
// so anonymous callers cannot bill/abuse the external service. Like the
// OSM/weather enrichment routes, it stays available without MongoDB.
router.use(requireAuth)

/**
 * Geocode an address query using OpenStreetMap Nominatim.
 * Query parameter: q (required, min 3 chars)
 * Returns: { latitude, longitude, displayAddress }
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

router.get(
  '/geocode',
  asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string | undefined)?.trim()

    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a location (minimum 3 characters).',
      })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      // Nominatim API request
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '1',
        'accept-language': 'en',
        countrycodes: 'in',
      })

const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'RakshaSafe/1.0 (contact@rakshasafe.local)',
            'Accept': 'application/json',
            'Referer': 'https://rakshasafe.local',
          },
          signal: controller.signal,
        },
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text()
        console.error('[geocode] Nominatim error response:', text)
        throw new Error(`Nominatim error: ${response.status}`)
      }

      const data = await response.json() as Array<{
        lat: string
        lon: string
        display_name: string
        address?: {
          road?: string
          suburb?: string
          city?: string
          state?: string
          postcode?: string
          country?: string
        }
      }>

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'We couldn\'t find that location. Please check the address and try again.',
        })
      }

      const result = data[0]

      // Extract display address from Nominatim response
      const displayParts: string[] = []
      if (result.address) {
        const { road, suburb, city, state, postcode, country } = result.address
        if (road) displayParts.push(road)
        if (suburb) displayParts.push(suburb)
        if (city) displayParts.push(city)
        if (state) displayParts.push(state)
        if (postcode) displayParts.push(postcode)
        if (country) displayParts.push(country)
      }

      const displayAddress = displayParts.length > 0
        ? displayParts.join(', ')
        : result.display_name || query

      res.json({
        success: true,
        data: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayAddress,
        },
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Location search timed out. Please try again.',
        })
      }
      console.error('[geocode] Error:', err)
      return res.status(502).json({
        success: false,
        error: 'Location search is temporarily unavailable. Please try again or use GPS.',
      })
    }
  }),
)

/**
 * Reverse-geocode valid GPS coordinates into a readable address using
 * OpenStreetMap Nominatim (server-side, rate-limited, cached).
 * Query parameters: lat, lng (required). Returns address or null —
 * callers keep latitude/longitude and show "unavailable" states.
 * Same public access policy as the forward-geocode sibling route.
 */
router.get(
  '/reverse',
  asyncHandler(async (req: Request, res: Response) => {
    const { input, issues } = validateNearbyQuery(req.query)
    if (!input || issues) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
      })
    }
    const address = await reverseGeocode(input.latitude, input.longitude)
    return res.json({ success: true, data: { address } })
  }),
)

export default router