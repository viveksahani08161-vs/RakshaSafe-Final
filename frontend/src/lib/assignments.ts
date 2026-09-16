import type { BadgeVariant } from '../components/ui/Badge'

export interface AssignmentTeam {
  id: string
  name: string
  teamType: string
  phone: string
}

export interface Assignment {
  id: string
  incidentId: string
  team: AssignmentTeam | null
  teamId: string
  assignedBy: string
  status: string
  assignedAt: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/** Documented workflow: ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED (+ CANCELLED). */
export const ASSIGNMENT_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED', 'CANCELLED']

export function assignmentBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ASSIGNED':
      return 'secondary'
    case 'EN_ROUTE':
      return 'primary'
    case 'ON_SCENE':
      return 'warning'
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
    default:
      return 'neutral'
  }
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
