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

/**
 * Assistive explanation attached to a freshly completed assessment.
 * Ephemeral (never stored): `gemini` = model-generated summary of the
 * canonical result, `fallback` = deterministic standard summary.
 * Neither carries a score — the stored assessment stays canonical.
 */
export interface RiskExplanation {
  text: string
  source: 'gemini' | 'fallback'
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
