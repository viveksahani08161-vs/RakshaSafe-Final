import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { Incident } from '../models/Incident.js'
import { Location } from '../models/Location.js'
import { findNearbyResources, type NearbySearchOutcome } from '../services/nearbyResources.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateNearbyQuery, validateRadiusKm } from '../validators/nearby.js'

function requireOwnerId(req: Request): string {
  const userId = req.auth?.userId
  if (!userId) throw unauthorized('Authentication required.')
  return userId
}

/**
 * GET /api/nearby-resources?lat=&lng=&radiusKm=
 * Authenticated general lookup (same access policy as the user
 * facilities/teams directory). Read-only; stored records only.
 */
export async function listNearbyResources(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { input, issues } = validateNearbyQuery(req.query, env.nearbyRadiusKm)
    if (!input || issues) {
      next(badRequest('Invalid location query.', issues))
      return
    }
    const { resources, external } = await findNearbyResources(
      input.latitude,
      input.longitude,
      input.radiusKm,
    )
    res.json({ success: true, data: { resources, external } })
  } catch (err) {
    next(err)
  }
}

async function nearbyForIncidentLocation(
  locationId: string | undefined,
  radiusKm: number,
): Promise<{ hasLocation: boolean; resources: NearbySearchOutcome['resources']; external: NearbySearchOutcome['external'] }> {
  if (!locationId) return { hasLocation: false, resources: [], external: { enabled: false, status: 'ok' } }
  const location = await Location.findById(locationId).select('latitude longitude').lean()
  if (!location) return { hasLocation: false, resources: [], external: { enabled: false, status: 'ok' } }
  const { resources, external } = await findNearbyResources(location.latitude, location.longitude, radiusKm)
  return { hasLocation: true, resources, external }
}

/**
 * GET /api/incidents/:id/nearby-resources
 * Owner-scoped: uses the incident's STORED location, never the caller's
 * current position (history must reflect the recorded place).
 */
export async function getIncidentNearbyResources(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }
    // Radius is optional here (the incident supplies the point); validate it alone.
    const { radiusKm, issue } = validateRadiusKm(req.query.radiusKm, env.nearbyRadiusKm)
    if (issue || radiusKm === undefined) {
      next(badRequest('Invalid location query.', issue ? [issue] : undefined))
      return
    }
    const incident = await Incident.findOne({ _id: id, userId: ownerId }).select('locationId')
    if (!incident) {
      next(notFoundError('Incident not found.'))
      return
    }
    const { hasLocation, resources, external } = await nearbyForIncidentLocation(
      incident.locationId ? String(incident.locationId) : undefined,
      radiusKm,
    )
    res.json({ success: true, data: { resources, hasLocation, external } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/incidents/:id/nearby-resources
 * Admin-scoped (router enforces requireAdmin): any incident by id,
 * still resolved from its STORED location only.
 */
export async function getAdminIncidentNearbyResources(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }
    const { radiusKm, issue } = validateRadiusKm(req.query.radiusKm, env.nearbyRadiusKm)
    if (issue || radiusKm === undefined) {
      next(badRequest('Invalid location query.', issue ? [issue] : undefined))
      return
    }
    const incident = await Incident.findById(id).select('locationId')
    if (!incident) {
      next(notFoundError('Incident not found.'))
      return
    }
    const { hasLocation, resources, external } = await nearbyForIncidentLocation(
      incident.locationId ? String(incident.locationId) : undefined,
      radiusKm,
    )
    res.json({ success: true, data: { resources, hasLocation, external } })
  } catch (err) {
    next(err)
  }
}
