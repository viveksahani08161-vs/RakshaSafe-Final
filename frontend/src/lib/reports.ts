export type Snapshot = Record<string, unknown>

export interface ReportMeta {
  id: string
  title: string
  reportType: string
  filters: Record<string, string>
  format: string
  createdAt: string
  expiresAt?: string
}

export interface ReportDetail extends ReportMeta {
  dataSnapshot: Snapshot
}

export const REPORT_TYPES = [
  { value: 'incident-summary', label: 'Incident Summary' },
  { value: 'resource-summary', label: 'Resource Summary' },
  { value: 'safety-overview', label: 'Safety Overview' },
]

export const REPORT_FORMATS = [
  { value: 'PDF', label: 'PDF' },
  { value: 'CSV', label: 'CSV' },
  { value: 'JSON', label: 'JSON' },
]

export const INCIDENT_STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']
export const INCIDENT_TYPES = ['Safety', 'Disaster']
export const INCIDENT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
