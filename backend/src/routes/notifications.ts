import { Router } from 'express'
import { listNotifications } from '../controllers/notificationController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// Users see notifications for their own incidents only.
// (The Notifications schema carries no read flag, so read state is a client affordance.)
router.use(requireAuth, requireDb)

router.get('/', listNotifications)

export default router
