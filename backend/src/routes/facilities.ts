import { Router } from 'express'
import { getFacilityUser, listFacilitiesUser } from '../controllers/facilityController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// Users see operational facilities only. Status changes are admin-only.
router.use(requireAuth, requireDb)

router.get('/', listFacilitiesUser)
router.get('/:id', getFacilityUser)

export default router
