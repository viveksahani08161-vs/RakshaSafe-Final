import { Router } from 'express'
import mongoose from 'mongoose'
import authRoutes from './auth.js'
import adminRoutes from './admin.js'
import emergencyContactRoutes from './emergencyContacts.js'
import facilityRoutes from './facilities.js'
import incidentRoutes from './incidents.js'
import nearbyRoutes from './nearby.js'
import notificationRoutes from './notifications.js'
import osmRoutes from './osm.js'
import weatherRoutes from './weather.js'
import rescueTeamRoutes from './rescueTeams.js'
import responderRoutes from './responder.js'
import unsafeReportRoutes from './unsafeReports.js'
import geocodeRoutes from './geocode.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use('/emergency-contacts', emergencyContactRoutes)
router.use('/incidents', incidentRoutes)
router.use('/facilities', facilityRoutes)
router.use('/nearby-resources', nearbyRoutes)
router.use('/nearby', osmRoutes)
router.use('/weather', weatherRoutes)
router.use('/notifications', notificationRoutes)
router.use('/rescue-teams', rescueTeamRoutes)
router.use('/responder', responderRoutes)
router.use('/unsafe-reports', unsafeReportRoutes)
router.use('/geocode', geocodeRoutes)

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
    time: new Date().toISOString(),
  })
})

export default router