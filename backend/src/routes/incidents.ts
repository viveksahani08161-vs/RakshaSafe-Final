import { Router } from 'express'
import { createIncident, getIncident, listIncidentUpdates, listIncidents } from '../controllers/incidentController.js'
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
router.get('/:id/updates', listIncidentUpdates)
router.post('/:id/risk', assessRisk)
router.get('/:id/risk', listRisk)

export default router
