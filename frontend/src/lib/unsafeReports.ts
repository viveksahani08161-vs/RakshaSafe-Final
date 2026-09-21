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

export const UNSAFE_REPORT_CATEGORIES = [
  { value: 'poorLighting', labelKey: 'unsafeReports.category.poorLighting' },
  { value: 'isolatedArea', labelKey: 'unsafeReports.category.isolatedArea' },
  { value: 'suspiciousActivity', labelKey: 'unsafeReports.category.suspiciousActivity' },
  { value: 'harassmentConcern', labelKey: 'unsafeReports.category.harassmentConcern' },
  { value: 'unsafeTransport', labelKey: 'unsafeReports.category.unsafeTransport' },
  { value: 'brokenCCTV', labelKey: 'unsafeReports.category.brokenCCTV' },
  { value: 'other', labelKey: 'unsafeReports.category.other' },
] as const

export const UNSAFE_REPORT_SEVERITIES = [
  { value: 'low', labelKey: 'unsafeReports.severity.low' },
  { value: 'medium', labelKey: 'unsafeReports.severity.medium' },
  { value: 'high', labelKey: 'unsafeReports.severity.high' },
  { value: 'critical', labelKey: 'unsafeReports.severity.critical' },
] as const
