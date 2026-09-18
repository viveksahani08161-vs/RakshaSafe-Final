import { assignmentBadgeVariant } from './assignments'
import type { ButtonVariant } from '../components/ui/Button'

export interface ResponderIncident {
  id: string
  category: string
  type: string
  priority: string
  status: string
  description: string
  createdAt: string
}

export interface ResponderAssignment {
  id: string
  incidentId: string
  team: { id: string; name: string; teamType: string; phone: string } | null
  teamId: string
  status: string
  assignedAt: string
  notes?: string
  incident: ResponderIncident | null
}

/**
 * Responder action mapping onto the single documented assignment workflow
 * (ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED, plus CANCELLED).
 * Accept = acknowledge the assignment and start responding (EN_ROUTE).
 * Returns translation keys for labels — the UI must call t() on them.
 */
export function nextActionsFor(status: string): { status: string; labelKey: string; variant: ButtonVariant }[] {
  switch (status) {
    case 'ASSIGNED':
      return [
        { status: 'EN_ROUTE', labelKey: 'responder.action.acceptRespond', variant: 'primary' },
        { status: 'CANCELLED', labelKey: 'responder.action.decline', variant: 'ghost' },
      ]
    case 'EN_ROUTE':
      return [
        { status: 'ON_SCENE', labelKey: 'responder.action.markOnScene', variant: 'primary' },
        { status: 'CANCELLED', labelKey: 'responder.action.cancel', variant: 'ghost' },
      ]
    case 'ON_SCENE':
      return [{ status: 'COMPLETED', labelKey: 'responder.action.markResolved', variant: 'primary' }]
    default:
      return []
  }
}

export { assignmentBadgeVariant }

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}