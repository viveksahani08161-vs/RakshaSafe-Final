import { Router } from 'express'
import { login, logout, me, register, updateProfile } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// Public auth endpoints are heavily targeted by credential stuffing;
// generous per-IP windows stop brute force without blocking legitimate use.
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many signups from this IP. Try again later.' })

router.post('/register', requireDb, registerLimiter, register)
router.post('/login', requireDb, rateLimit({ windowMs: 15 * 60 * 1000, max: 40, message: 'Too many login attempts. Try again in a few minutes.' }), login)
router.post('/logout', logout)
router.get('/me', requireAuth, requireDb, me)
router.patch('/profile', requireAuth, requireDb, updateProfile)

export default router
