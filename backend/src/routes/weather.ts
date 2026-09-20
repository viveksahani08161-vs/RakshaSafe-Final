import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getWeather } from '../services/weather.js'
import { HttpError } from '../utils/errors.js'
import { validateNearbyQuery } from '../validators/nearby.js'

const router = Router()

/**
 * Authenticated, database-independent enrichment lookup.
 * requireDb is deliberately absent: informational weather must stay
 * available even when MongoDB is unreachable.
 */
router.use(requireAuth)

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * GET /api/weather?lat=&lng=
 * Current + today weather via Open-Meteo (no API key). Upstream failure
 * yields a controlled 502 so clients show "Weather unavailable" —
 * it never affects incident creation.
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
    const outcome = await getWeather(input.latitude, input.longitude)
    if (outcome.status === 'error' || !outcome.weather) {
      throw new HttpError(502, 'Weather unavailable. Please try again later.')
    }
    return res.json({ success: true, data: outcome.weather })
  }),
)

export default router
