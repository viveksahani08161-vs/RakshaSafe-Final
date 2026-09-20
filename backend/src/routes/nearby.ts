import { Router } from 'express'
import { listNearbyResources } from '../controllers/nearbyController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// Same access policy as the user facilities/teams directory:
// any authenticated role, database-backed.
router.use(requireAuth, requireDb)

router.get('/', listNearbyResources)

export default router
