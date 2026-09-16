import { Router } from 'express'
import { getTeamUser, listTeamsUser } from '../controllers/rescueTeamController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// Users see active teams only. Status changes are admin-only.
router.use(requireAuth, requireDb)

router.get('/', listTeamsUser)
router.get('/:id', getTeamUser)

export default router
