import { Router } from 'express'
import { login, logout, me, register, updateProfile } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

router.post('/register', requireDb, register)
router.post('/login', requireDb, login)
router.post('/logout', logout)
router.get('/me', requireAuth, requireDb, me)
router.patch('/profile', requireAuth, requireDb, updateProfile)

export default router
