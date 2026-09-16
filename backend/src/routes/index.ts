import { Router } from 'express'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import authRoutes from './auth.js'
import adminRoutes from './admin.js'
import emergencyContactRoutes from './emergencyContacts.js'
import facilityRoutes from './facilities.js'
import incidentRoutes from './incidents.js'
import notificationRoutes from './notifications.js'
import rescueTeamRoutes from './rescueTeams.js'
import unsafeReportRoutes from './unsafeReports.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use('/emergency-contacts', emergencyContactRoutes)
router.use('/incidents', incidentRoutes)
router.use('/facilities', facilityRoutes)
router.use('/notifications', notificationRoutes)
router.use('/rescue-teams', rescueTeamRoutes)
router.use('/unsafe-reports', unsafeReportRoutes)

router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState
  res.json({
    success: true,
    service: 'rakshasafe-backend',
    status: 'ok',
    db: {
      state: dbState, // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
      connected: dbState === 1,
    },
    aiServiceUrl: env.aiServiceUrl,
    time: new Date().toISOString(),
  })
})

export default router