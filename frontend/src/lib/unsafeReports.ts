import type { IncidentLocation } from './incidents'

export interface UnsafeReport {
  id: string
  category: string
  description: string
  severity: string
  isVerified: boolean
  locationId: string
  location: IncidentLocation | null
  createdAt: string
  updatedAt: string
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
