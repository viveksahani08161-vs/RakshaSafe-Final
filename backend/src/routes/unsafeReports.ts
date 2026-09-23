import { Router } from 'express'
import { createUnsafeReport, deleteUnsafeReport, getUnsafeReport, listUnsafeReports, updateUnsafeReport } from '../controllers/unsafeReportController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// User-owned reports: identity comes from the JWT, never the body.
router.use(requireAuth, requireDb)

// Cap report submission per IP to keep the moderation queue honest.
router.post('/', rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many reports submitted. Please wait a moment.' }), createUnsafeReport)
router.get('/', listUnsafeReports)
router.get('/:id', getUnsafeReport)
router.patch('/:id', updateUnsafeReport)
router.delete('/:id', deleteUnsafeReport)

export default router
