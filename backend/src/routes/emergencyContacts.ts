import { Router } from 'express'
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from '../controllers/emergencyContactController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDb } from '../middleware/requireDb.js'

const router = Router()

// All contact routes are user-owned: identity comes from the JWT, never the body.
router.use(requireAuth, requireDb)

router.post('/', createContact)
router.get('/', listContacts)
router.patch('/:id', updateContact)
router.delete('/:id', deleteContact)

export default router
