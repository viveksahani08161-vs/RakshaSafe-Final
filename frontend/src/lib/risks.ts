import type { BadgeVariant } from '../components/ui/Badge'

export interface RiskAssessment {
  id: string
  locationId: string
  riskScore: number
  riskLevel: string
  modelVersion: string
  inputFactors: { factor: string; value: string | number; weight: number }[]
  assessedAt: string
  createdAt: string
}

export function riskLevelVariant(level: string): BadgeVariant {
  switch (level) {
    case 'LOW':
      return 'success'
    case 'MEDIUM':
      return 'secondary'
    case 'HIGH':
      return 'warning'
    case 'CRITICAL':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
