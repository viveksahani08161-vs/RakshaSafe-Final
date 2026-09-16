import type { BadgeVariant } from '../components/ui/Badge'

export interface NotificationItem {
  id: string
  incidentId: string
  incident: { id: string; category: string; status: string } | null
  contactId?: string
  contactName?: string
  channel: string
  status: string
  providerResponse?: string
  attemptCount: number
  lastAttemptAt?: string
  createdAt: string
  updatedAt: string
}

export function channelBadgeVariant(channel: string): BadgeVariant {
  switch (channel) {
    case 'In-App':
      return 'primary'
    case 'Email':
      return 'secondary'
    case 'SMS':
      return 'warning'
    case 'WhatsApp':
      return 'success'
    default:
      return 'neutral'
  }
}

export function notificationStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'DELIVERED':
      return 'success'
    case 'SENT':
      return 'secondary'
    case 'QUEUED':
      return 'warning'
    case 'FAILED':
      return 'danger'
    case 'NOT_CONFIGURED':
    case 'UNAVAILABLE':
    default:
      return 'neutral'
  }
}

/**
 * Friendly label derived from the stored in-app event marker
 * (`in-app:<event>` in providerResponse). Falls back to channel wording —
 * never invents an event that was not recorded.
 */
export function eventLabel(n: NotificationItem): string {
  const raw = n.providerResponse ?? ''
  if (raw.startsWith('in-app:incident.created')) return 'Incident created'
  if (raw.startsWith('in-app:incident.status.changed:')) {
    const rest = raw.slice('in-app:incident.status.changed:'.length)
    const [from, to] = rest.split('->')
    return from && to ? `Status changed: ${from} → ${to}` : 'Status changed'
  }
  if (raw.startsWith('in-app:incident.assigned:')) {
    const team = raw.slice('in-app:incident.assigned:'.length)
    return team ? `Team assigned: ${team}` : 'Team assigned'
  }
  if (n.channel === 'In-App') return 'Update'
  return `${n.channel} notification`
}

function cursorKey(userId: string): string {
  return `rakshasafe.notifications.seen.${userId}`
}

/**
 * Client-side read cursor (UI preference only — the Notifications schema
 * carries no read flag, so all record data always comes from the backend).
 */
export function getLastSeen(userId: string): string | null {
  try {
    return window.localStorage.getItem(cursorKey(userId))
  } catch {
    return null
  }
}

export function setLastSeen(userId: string, at: Date = new Date()): void {
  try {
    window.localStorage.setItem(cursorKey(userId), at.toISOString())
  } catch {
    /* storage unavailable — badge simply stays */
  }
}

export function isUnread(n: NotificationItem, cursor: string | null): boolean {
  if (!cursor) return true
  const seen = new Date(cursor).getTime()
  const created = new Date(n.createdAt).getTime()
  if (Number.isNaN(seen) || Number.isNaN(created)) return true
  return created > seen
}
