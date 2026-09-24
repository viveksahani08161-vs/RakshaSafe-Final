import type { NextFunction, Request, Response } from 'express'
import type { Types } from 'mongoose'
import { AdminLog } from '../models/AdminLog.js'
import { EmergencyContact } from '../models/EmergencyContact.js'
import { User } from '../models/User.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { isValidObjectId, validateContactUpdate } from '../validators/emergencyContact.js'
import { toSafeContact } from './emergencyContactController.js'

interface AdminContactListItem extends ReturnType<typeof toSafeContact> {
  ownerName: string
  ownerEmail: string
  ownerPhone: string
}

function requireAdminId(req: Request): string {
  const adminId = req.auth?.userId
  if (!adminId) throw unauthorized('Authentication required.')
  return adminId
}

/**
 * GET /api/admin/users/:userId/emergency-contacts
 * Returns ONLY the requested user's emergency contacts. The admin role is
 * enforced by the router (requireAuth + requireAdmin + requireDb); the
 * userId comes from the URL as a scoping parameter, never from the payload.
 */
export async function listEmergencyContactsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params
    if (!isValidObjectId(userId)) {
      next(badRequest('Invalid user id.', [{ field: 'userId', message: 'Must be a valid ObjectId.' }]))
      return
    }

    const user = await User.findById(userId).select('_id').lean()
    if (!user) {
      next(notFoundError('User not found.'))
      return
    }

    const docs = await EmergencyContact.find({ userId }).sort({ createdAt: -1 })
    res.json({ success: true, data: { contacts: docs.map(toSafeContact) } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/emergency-contacts
 * Returns ALL emergency contacts across all users with owner information.
 * Admin-only endpoint with optional search and pagination.
 */
export async function listAllEmergencyContactsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(typeof req.query.page === 'string' ? req.query.page : '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(typeof req.query.limit === 'string' ? req.query.limit : '20', 10)))
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const skip = (page - 1) * limit

    // Build search filter for contacts. Matches native contact fields plus the
    // owner account (name/email/phone) so admins can find a contact by user.
    // `$in: []` matches nothing, which is correct when no owner matched.
    const contactFilter: Record<string, unknown> = {}
    if (search !== '') {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      const ownerMatches = await User.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }] })
        .select('_id')
        .lean()
      contactFilter.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { relationship: regex },
        { userId: { $in: ownerMatches.map((u) => u._id) } },
      ]
    }

    // Get contacts with user info
    const [docs, total, summary] = await Promise.all([
      EmergencyContact.find(contactFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmergencyContact.countDocuments(contactFilter),
      EmergencyContact.aggregate<{
        total: number
        owners: Types.ObjectId[]
        alerts: number
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            owners: { $addToSet: '$userId' },
            alerts: { $sum: { $cond: [{ $or: ['$notifyViaSms', '$notifyViaEmail'] }, 1, 0] } },
          },
        },
      ]),
    ])

    const summaryRow = summary[0]
    const summaryData = {
      totalContacts: summaryRow?.total ?? 0,
      totalOwners: summaryRow?.owners.length ?? 0,
      alertsEnabled: summaryRow?.alerts ?? 0,
    }

    if (docs.length === 0) {
      res.json({
        success: true,
        data: {
          contacts: [],
          summary: summaryData,
          pagination: { page, limit, total, totalPages: 0 },
        },
      })
      return
    }

    // Fetch owner details for all contacts
    const userIds = [...new Set(docs.map((d) => String(d.userId)))]
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email phone')
      .lean()
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    const contacts: AdminContactListItem[] = docs.map((doc) => {
      const owner = userMap.get(String(doc.userId))
      return {
        ...toSafeContact(doc as any),
        ownerName: owner?.name ?? 'Unknown',
        ownerEmail: owner?.email ?? '',
        ownerPhone: owner?.phone ?? '',
      }
    })

    res.json({
      success: true,
      data: {
        contacts,
        summary: summaryData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/emergency-contacts/:contactId
 * Updates only the allowed contact fields. Ownership is never assignable via
 * the request payload; if the client supplies a userId it is treated purely
 * as a cross-check and a mismatch returns 404.
 */
export async function updateEmergencyContactAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { contactId } = req.params
    if (!isValidObjectId(contactId)) {
      next(badRequest('Invalid contact id.', [{ field: 'contactId', message: 'Must be a valid ObjectId.' }]))
      return
    }

    const { input, issues } = validateContactUpdate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid contact data.', issues))
      return
    }

    const doc = await EmergencyContact.findById(contactId)
    if (!doc) {
      next(notFoundError('Contact not found.'))
      return
    }

    const b = (req.body ?? {}) as Record<string, unknown>
    if (b.userId !== undefined) {
      if (typeof b.userId !== 'string' || !isValidObjectId(b.userId) || String(doc.userId) !== b.userId) {
        next(notFoundError('Contact not found.'))
        return
      }
    }

    if (input.name !== undefined) doc.name = input.name
    if (input.phone !== undefined) doc.phone = input.phone
    if ('email' in input) doc.email = input.email
    if ('relationship' in input) doc.relationship = input.relationship
    if (input.notifyViaSms !== undefined) doc.notifyViaSms = input.notifyViaSms
    if (input.notifyViaEmail !== undefined) doc.notifyViaEmail = input.notifyViaEmail
    await doc.save()

    await AdminLog.create({
      adminId,
      action: 'emergencyContact.update',
      targetType: 'EmergencyContacts',
      targetId: doc._id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })

    res.json({ success: true, data: { contact: toSafeContact(doc) } })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/emergency-contacts/:contactId
 * Deletes the contact and nothing else. Ownership is enforced on the stored
 * document — a client-supplied userId mismatch (or unknown wrapper) is not
 * trusted and yields 404.
 */
export async function deleteEmergencyContactAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = requireAdminId(req)
    const { contactId } = req.params
    if (!isValidObjectId(contactId)) {
      next(badRequest('Invalid contact id.', [{ field: 'contactId', message: 'Must be a valid ObjectId.' }]))
      return
    }

    const filter: Record<string, unknown> = { _id: contactId }
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined
    if (userId !== undefined) {
      if (!isValidObjectId(userId)) {
        next(badRequest('Invalid user id.', [{ field: 'userId', message: 'Must be a valid ObjectId.' }]))
        return
      }
      filter.userId = userId
    }

    const doc = await EmergencyContact.findOneAndDelete(filter)
    if (!doc) {
      next(notFoundError('Contact not found.'))
      return
    }

    await AdminLog.create({
      adminId,
      action: 'emergencyContact.delete',
      targetType: 'EmergencyContacts',
      targetId: doc._id,
      ...(req.ip ? { ipAddress: req.ip } : {}),
    })

    res.json({ success: true, data: { message: 'Contact deleted.', id: String(doc._id) } })
  } catch (err) {
    next(err)
  }
}