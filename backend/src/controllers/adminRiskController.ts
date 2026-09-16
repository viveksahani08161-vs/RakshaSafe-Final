import type { NextFunction, Request, Response } from 'express'
import { Incident } from '../models/Incident.js'
import { RiskAssessment } from '../models/RiskAssessment.js'
import { badRequest, notFoundError } from '../utils/errors.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { toSafeAssessment } from './riskController.js'

/** GET /api/admin/incidents/:id/risk — assessments for one incident, newest first. */
export async function listRiskAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }
    const incident = await Incident.findById(id).select('_id locationId')
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
