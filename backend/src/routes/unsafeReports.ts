import { Router } from 'express'
import { createUnsafeReport, getUnsafeReport, listUnsafeReports } from '../controllers/unsafeReportController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// User-owned reports: identity comes from the JWT, never the body.
router.use(requireAuth, requireDb)

router.post('/', createUnsafeReport)
router.get('/', listUnsafeReports)
router.get('/:id', getUnsafeReport)

export default router
