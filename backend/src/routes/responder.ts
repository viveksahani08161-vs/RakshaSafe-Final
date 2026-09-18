import { Router } from 'express'
import {
  getMyIncident,
  listMyAssignments,
  listMyNotifications,
  updateMyAssignment,
} from '../controllers/responderController.js'
import { requireAuth, requireResponder } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// Responder-owned scope: identity comes from the JWT, and every lookup is
// constrained to teams the caller belongs to. Status changes use the same
// documented assignment workflow as the admin flow.
router.use(requireAuth, requireResponder, requireDb)

router.get('/assignments', listMyAssignments)
router.patch('/assignments/:id', updateMyAssignment)
router.get('/incidents/:id', getMyIncident)
router.get('/notifications', listMyNotifications)

export default router
