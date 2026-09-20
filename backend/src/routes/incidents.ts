import { Router } from 'express'
import {
  createIncident,
  deleteIncident,
  getIncident,
  listIncidentUpdates,
  listIncidents,
  updateIncident,
} from '../controllers/incidentController.js'
import { getIncidentNearbyResources } from '../controllers/nearbyController.js'
import { assessRisk, listRisk } from '../controllers/riskController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// All incident routes are user-owned: identity comes from the JWT, never the body.
// Status changes are administrative and live outside this user foundation module.
router.use(requireAuth, requireDb)

router.post('/', createIncident)
router.get('/', listIncidents)
router.get('/:id', getIncident)
router.patch('/:id', updateIncident)
router.delete('/:id', deleteIncident)
router.get('/:id/updates', listIncidentUpdates)
router.post('/:id/risk', assessRisk)
router.get('/:id/risk', listRisk)
router.get('/:id/nearby-resources', getIncidentNearbyResources)

export default router
