import { Router } from 'express'
import { listNotificationsAdmin, listUsers, getUserAdmin, updateUserAdmin, deleteUserAdmin } from '../controllers/adminController.js'
import {
  deleteEmergencyContactAdmin,
  listAllEmergencyContactsAdmin,
  listEmergencyContactsAdmin,
  updateEmergencyContactAdmin,
} from '../controllers/adminEmergencyContactController.js'
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
  addTeamMember,
  createTeam,
  getTeamAdmin,
  getTeamMembers,
  listTeamsAdmin,
  removeTeamMember,
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
  deleteUnsafeReportAdmin,
} from '../controllers/adminUnsafeReportController.js'
import { getAdminIncidentNearbyResources } from '../controllers/nearbyController.js'
import { listRiskAdmin } from '../controllers/adminRiskController.js'
import { getDashboard } from '../controllers/adminDashboardController.js'
import {
  deleteReport,
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
router.delete('/reports/:id', deleteReport)
router.get('/users', listUsers)
router.get('/users/:id', getUserAdmin)
router.patch('/users/:id', updateUserAdmin)
router.delete('/users/:id', deleteUserAdmin)
router.get('/users/:userId/emergency-contacts', listEmergencyContactsAdmin)
router.get('/emergency-contacts', listAllEmergencyContactsAdmin)
router.patch('/emergency-contacts/:contactId', updateEmergencyContactAdmin)
router.delete('/emergency-contacts/:contactId', deleteEmergencyContactAdmin)
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
router.get('/rescue-teams/:id/members', getTeamMembers)
router.post('/rescue-teams/:id/members', addTeamMember)
router.delete('/rescue-teams/:id/members/:userId', removeTeamMember)
router.post('/incidents/:id/assignments', createAssignment)
router.get('/incidents/:id/assignments', listIncidentAssignments)
router.patch('/assignments/:id', updateAssignment)
router.get('/unsafe-reports', listUnsafeReportsAdmin)
router.get('/unsafe-reports/:id', getUnsafeReportAdmin)
router.patch('/unsafe-reports/:id', verifyUnsafeReport)
router.delete('/unsafe-reports/:id', deleteUnsafeReportAdmin)
router.get('/incidents/:id/risk', listRiskAdmin)
router.get('/incidents/:id/nearby-resources', getAdminIncidentNearbyResources)

export default router
