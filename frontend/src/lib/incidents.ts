import type { BadgeVariant } from '../components/ui/Badge'

export interface Incident {
  id: string
  userId: string
  type: string
  category: string
  description: string
  priority: string
  status: string
  locationId?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

/** Documented workflow: REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED (+ CANCELLED). */
export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'REPORTED':
      return 'warning'
    case 'ACKNOWLEDGED':
    case 'ASSIGNED':
      return 'secondary'
    case 'IN_PROGRESS':
      return 'primary'
    case 'RESOLVED':
      return 'success'
    case 'CANCELLED':
      return 'danger'
    case 'CLOSED':
    default:
      return 'neutral'
  }
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export interface IncidentLocation {
  id: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  country?: string
  accuracy?: number
}

/** Documented incident category examples (Chapter 3 §3.4.1.5). */
export const INCIDENT_CATEGORIES = [
  'Women Safety',
  'Medical Emergency',
  'Accident',
  'Fire',
  'Flood',
  'Earthquake',
  'Other Emergency',
]
