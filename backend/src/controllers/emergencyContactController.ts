import type { NextFunction, Request, Response } from 'express'
import { EmergencyContact, type IEmergencyContact } from '../models/EmergencyContact.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import {
  isValidObjectId,
  validateContactCreate,
  validateContactUpdate,
} from '../validators/emergencyContact.js'

interface SafeContact {
  id: string
  userId: string
  name: string
  phone: string
  email?: string
  relationship?: string
  notifyViaSms: boolean
  notifyViaEmail: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

/** Contacts carry no secrets, but serialization stays explicit and minimal. */
export function toSafeContact(doc: IEmergencyContact): SafeContact {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    phone: doc.phone,
    ...(doc.email ? { email: doc.email } : {}),
    ...(doc.relationship ? { relationship: doc.relationship } : {}),
    notifyViaSms: doc.notifyViaSms,
    notifyViaEmail: doc.notifyViaEmail,
    isPrimary: doc.isPrimary,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function requireOwnerId(req: Request): string {
  const userId = req.auth?.userId
  if (!userId) throw unauthorized('Authentication required.')
  return userId
}

/**
 * POST /api/emergency-contacts
 * The owner is always derived from the JWT — a client-supplied userId is never trusted.
 */
export async function createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { input, issues } = validateContactCreate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid contact data.', issues))
      return
    }

    const doc = await EmergencyContact.create({ ...input, userId: ownerId })
    res.status(201).json({ success: true, data: { contact: toSafeContact(doc) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/emergency-contacts — only the caller's own contacts. */
export async function listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const docs = await EmergencyContact.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(100)
    res.json({ success: true, data: { contacts: docs.map(toSafeContact) } })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/emergency-contacts/:id
 * Scoped lookup `{ _id, userId }`: another user's id yields 404, never their data.
 */
export async function updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid contact id.'))
      return
    }
    const { input, issues } = validateContactUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid contact data.', issues))
      return
    }

    const doc = await EmergencyContact.findOne({ _id: id, userId: ownerId })
    if (!doc) {
      next(notFoundError('Contact not found.'))
      return
    }

    if (input.name !== undefined) doc.name = input.name
    if (input.phone !== undefined) doc.phone = input.phone
    if ('email' in input) doc.email = input.email
    if ('relationship' in input) doc.relationship = input.relationship
    if (input.notifyViaSms !== undefined) doc.notifyViaSms = input.notifyViaSms
    if (input.notifyViaEmail !== undefined) doc.notifyViaEmail = input.notifyViaEmail
    await doc.save()

    res.json({ success: true, data: { contact: toSafeContact(doc) } })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/emergency-contacts/:id
 * Scoped delete `{ _id, userId }`: another user's id yields 404, nothing is removed.
 */
export async function deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid contact id.'))
      return
    }

    const doc = await EmergencyContact.findOneAndDelete({ _id: id, userId: ownerId })
    if (!doc) {
      next(notFoundError('Contact not found.'))
      return
    }

    res.json({ success: true, data: { message: 'Contact deleted.', id: String(doc._id) } })
  } catch (err) {
    next(err)
  }
}
