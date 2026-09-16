import type { NextFunction, Request, Response } from 'express'
import { EmergencyContact } from '../models/EmergencyContact.js'
import { Incident } from '../models/Incident.js'
import { Notification, type INotification } from '../models/Notification.js'
import { unauthorized } from '../utils/errors.js'

export interface SafeNotification {
  id: string
  incidentId: string
  incident: { id: string; category: string; status: string } | null
  contactId?: string
  contactName?: string
  channel: string
  status: string
  providerResponse?: string
  attemptCount: number
  lastAttemptAt?: Date
  createdAt: Date
  updatedAt: Date
}

export function toSafeNotification(
  doc: INotification,
  incident: { id: string; category: string; status: string } | null,
  contactName?: string,
): SafeNotification {
  return {
    id: String(doc._id),
    incidentId: String(doc.incidentId),
    incident,
    ...(doc.contactId ? { contactId: String(doc.contactId) } : {}),
    ...(contactName ? { contactName } : {}),
    channel: doc.channel,
    status: doc.status,
    ...(doc.providerResponse ? { providerResponse: doc.providerResponse } : {}),
    attemptCount: doc.attemptCount,
    ...(doc.lastAttemptAt ? { lastAttemptAt: doc.lastAttemptAt } : {}),
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
 * GET /api/notifications — notifications for the caller's own incidents only,
 * newest first. Ownership derives from the incident, never from the client.
 */
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)

    const ownIncidents = await Incident.find({ userId: ownerId }).select('_id category status')
    const incidentMap = new Map(
      ownIncidents.map((i) => [String(i._id), { id: String(i._id), category: i.category, status: i.status }]),
    )
    if (incidentMap.size === 0) {
      res.json({ success: true, data: { notifications: [] } })
      return
    }

    const docs = await Notification.find({ incidentId: { $in: [...incidentMap.keys()] } }).sort({ createdAt: -1 })
    const contacts = await EmergencyContact.find({ userId: ownerId }).select('_id name')
    const contactNames = new Map(contacts.map((c) => [String(c._id), c.name]))

    res.json({
      success: true,
      data: {
        notifications: docs.map((d) =>
          toSafeNotification(
            d,
            incidentMap.get(String(d.incidentId)) ?? null,
            d.contactId ? contactNames.get(String(d.contactId)) : undefined,
          ),
        ),
      },
    })
  } catch (err) {
    next(err)
  }
}
