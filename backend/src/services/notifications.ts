import type { Types } from 'mongoose'
import { EmergencyContact } from '../models/EmergencyContact.js'
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
} from '../models/Notification.js'

interface NewNotification {
  incidentId: string
  contactId?: Types.ObjectId
  channel: NotificationChannel
  status: NotificationStatus
  providerResponse?: string
  attemptCount: number
  lastAttemptAt?: Date
}

/**
 * Documented notification events (Chapter 3 §4.1.11). An event is recorded
 * only when the underlying action actually succeeded — callers invoke this
 * helper after their primary write completes.
 */
export type IncidentEvent =
  | { kind: 'incident.created' }
  | { kind: 'incident.status.changed'; from: string; to: string }
  | { kind: 'incident.assigned'; teamName: string }

function eventLabel(event: IncidentEvent): string {
  switch (event.kind) {
    case 'incident.created':
      return 'incident.created'
    case 'incident.status.changed':
      return `incident.status.changed:${event.from}->${event.to}`
    case 'incident.assigned':
      return `incident.assigned:${event.teamName}`
  }
}

/**
 * Record an incident event as notification documents:
 * - one In-App record for the owner (the app itself is the in-app provider,
 *   so storage + serving IS the delivery → DELIVERED);
 * - one record per opted contact channel (SMS/Email). No external provider
 *   is configured in this project, so these honestly report NOT_CONFIGURED
 *   instead of fabricating delivery.
 */
export async function recordIncidentEvent(
  incidentId: string,
  ownerId: string,
  event: IncidentEvent,
): Promise<void> {
  const label = eventLabel(event)
  const now = new Date()
  const docs: NewNotification[] = [
    {
      incidentId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.DELIVERED,
      providerResponse: `in-app:${label}`,
      attemptCount: 1,
      lastAttemptAt: now,
    },
  ]

  const contacts = await EmergencyContact.find({ userId: ownerId }).select('_id notifyViaSms notifyViaEmail')
  for (const contact of contacts) {
    if (contact.notifyViaSms) {
      docs.push({
        incidentId,
        contactId: contact._id,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.NOT_CONFIGURED,
        providerResponse: 'No SMS provider configured',
        attemptCount: 0,
      })
    }
    if (contact.notifyViaEmail) {
      docs.push({
        incidentId,
        contactId: contact._id,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.NOT_CONFIGURED,
        providerResponse: 'No Email provider configured',
        attemptCount: 0,
      })
    }
  }

  await Notification.insertMany(docs)
}

/**
 * Best-effort wrapper for event hooks: a notification write failure is
 * logged but never fails (or duplicates) the primary operation, and no
 * secrets are ever logged.
 */
export async function recordEventSafe(
  incidentId: string,
  ownerId: string,
  event: IncidentEvent,
): Promise<void> {
  try {
    await recordIncidentEvent(incidentId, ownerId, event)
  } catch (err) {
    console.error('[notifications] failed to record event:', (err as Error).message)
  }
}
