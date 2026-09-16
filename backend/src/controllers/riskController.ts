import type { NextFunction, Request, Response } from 'express'
import { Incident } from '../models/Incident.js'
import { Location } from '../models/Location.js'
import { RiskAssessment, type IRiskAssessment } from '../models/RiskAssessment.js'
import { assessIncident } from '../services/riskAssessment.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'

export interface SafeRiskAssessment {
  id: string
  locationId: string
  riskScore: number
  riskLevel: string
  modelVersion: string
  inputFactors: Record<string, unknown>[]
  assessedAt: Date
  createdAt: Date
}

export function toSafeAssessment(doc: IRiskAssessment): SafeRiskAssessment {
  return {
    id: String(doc._id),
    locationId: String(doc.locationId),
    riskScore: doc.riskScore,
    riskLevel: doc.riskLevel,
    modelVersion: doc.modelVersion,
    inputFactors: doc.inputFactors ?? [],
    assessedAt: doc.assessedAt,
    createdAt: doc.createdAt,
  }
}

function requireOwnerId(req: Request): string {
  const userId = req.auth?.userId
  if (!userId) throw unauthorized('Authentication required.')
  return userId
}

/**
 * POST /api/incidents/:id/risk — assistive assessment of the caller's own
 * incident. Requires stored coordinates (the schema ties assessments to
 * Locations). The incident itself is never modified; a failed scoring
 * attempt stores nothing and reports an error instead of success.
 */
export async function assessRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }

    const incident = await Incident.findOne({ _id: id, userId: ownerId })
    if (!incident) {
      next(notFoundError('Incident not found.'))
      return
    }
    if (!incident.locationId) {
      next(badRequest('Risk assessment needs stored coordinates.', [{ field: 'locationId', message: 'This incident has no location.' }]))
      return
    }
    const location = await Location.findById(incident.locationId)
    if (!location) {
      next(badRequest('Risk assessment needs stored coordinates.', [{ field: 'locationId', message: 'Location not found.' }]))
      return
    }

    const doc = await assessIncident(incident, location)
    res.status(201).json({ success: true, data: { assessment: toSafeAssessment(doc) } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/incidents/:id/risk — past assessments of the caller's own
 * incident, newest first. Ownership checked before anything is returned.
 */
export async function listRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }

    const incident = await Incident.findOne({ _id: id, userId: ownerId }).select('_id locationId')
    if (!incident) {
      next(notFoundError('Incident not found.'))
      return
    }
    if (!incident.locationId) {
      res.json({ success: true, data: { assessments: [] } })
      return
    }
    const docs = await RiskAssessment.find({ locationId: incident.locationId }).sort({ assessedAt: -1 })
    res.json({ success: true, data: { assessments: docs.map(toSafeAssessment) } })
  } catch (err) {
    next(err)
  }
}
