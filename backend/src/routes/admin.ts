import { Router } from 'express'
import { listNotificationsAdmin, listUsers } from '../controllers/adminController.js'
import {
  createFacility,
  getFacilityAdmin,
  listFacilitiesAdmin,
  updateFacility,
} from '../controllers/adminFacilityController.js'
import {
  getIncidentAdmin,
  getIncidentsSummary,
  listIncidentsAdmin,
  updateIncidentStatus,
} from '../controllers/adminIncidentController.js'
import {
  createTeam,
  getTeamAdmin,
  listTeamsAdmin,
  updateTeam,
} from '../controllers/adminRescueTeamController.js'
import {
  createAssignment,
  listIncidentAssignments,
  updateAssignment,
} from '../controllers/adminAssignmentController.js'
import {
  getUnsafeReportAdmin,
  listUnsafeReportsAdmin,
  verifyUnsafeReport,
} from '../controllers/adminUnsafeReportController.js'
import { listRiskAdmin } from '../controllers/adminRiskController.js'
import { getDashboard } from '../controllers/adminDashboardController.js'
import {
  exportReport,
  generateReport,
  getReport,
  listReports,
} from '../controllers/adminReportController.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

router.use(requireAuth, requireAdmin, requireDb)

router.get('/dashboard', getDashboard)
router.post('/reports', generateReport)
router.get('/reports', listReports)
router.get('/reports/:id', getReport)
router.get('/reports/:id/export', exportReport)
router.get('/users', listUsers)
router.get('/notifications', listNotificationsAdmin)
router.get('/incidents/summary', getIncidentsSummary)
router.get('/incidents', listIncidentsAdmin)
router.get('/incidents/:id', getIncidentAdmin)
router.patch('/incidents/:id/status', updateIncidentStatus)
router.post('/facilities', createFacility)
router.get('/facilities', listFacilitiesAdmin)
router.get('/facilities/:id', getFacilityAdmin)
router.patch('/facilities/:id', updateFacility)
router.post('/rescue-teams', createTeam)
router.get('/rescue-teams', listTeamsAdmin)
router.get('/rescue-teams/:id', getTeamAdmin)
router.patch('/rescue-teams/:id', updateTeam)
router.post('/incidents/:id/assignments', createAssignment)
router.get('/incidents/:id/assignments', listIncidentAssignments)
router.patch('/assignments/:id', updateAssignment)
router.get('/unsafe-reports', listUnsafeReportsAdmin)
router.get('/unsafe-reports/:id', getUnsafeReportAdmin)
router.patch('/unsafe-reports/:id', verifyUnsafeReport)
router.get('/incidents/:id/risk', listRiskAdmin)

export default router
