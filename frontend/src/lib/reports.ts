export type Snapshot = Record<string, unknown>

export interface ReportMeta {
  id: string
  serialNo?: string | null
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
  { value: 'incident-record', label: 'Help Request Report (SOS Incident)' },
  { value: 'unsafe-area-record', label: 'Unsafe-Area Report' },
  { value: 'user-incident-summary', label: 'User Help Request Summary' },
  { value: 'incident-summary', label: 'Incident Summary' },
  { value: 'resource-summary', label: 'Resource Summary' },
  { value: 'safety-overview', label: 'Safety Overview' },
]

/** Report types scoped to one selected user. */
export const USER_SCOPED_REPORT_TYPES = ['user-incident-summary', 'incident-record', 'unsafe-area-record']

/** Single-record types: exactly one record must be selected. */
export const SINGLE_RECORD_REPORT_TYPES = ['incident-record', 'unsafe-area-record']

export interface ScopedUser {
  id: string
  name: string
  email: string
  phone: string
}

export interface UserRecordOption {
  id: string
  title: string
  detail: string
}

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
