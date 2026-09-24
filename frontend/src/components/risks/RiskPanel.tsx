import { formatDateTime, riskLevelVariant, type RiskAssessment } from '../../lib/risks'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'

interface RiskPanelProps {
  assessments: RiskAssessment[]
  loading: boolean
  assessing: boolean
  assessError: string | null
  canAssess: boolean
  noLocation: boolean
  onAssess: () => void
  onDismissError: () => void
  /** Empty-state copy. Defaults suit the incident owner; the admin view passes its own wording. */
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Assistive AI risk display. Every value shown comes from the stored
 * backend assessment (the backend score is the single source of truth —
 * this component never recalculates a risk level).
 */
function factorLabel(factor: string): string {
  switch (factor) {
    case 'priorityBase':
      return 'Incident priority'
    case 'typeModifier':
      return 'Incident type'
    case 'verifiedReports':
      return 'Verified unsafe-area reports nearby'
    case 'unverifiedReports':
      return 'Unverified reports nearby'
    case 'activeIncidents':
      return 'Active incidents nearby'
    default:
      return factor
  }
}
export function RiskPanel({
  assessments,
  loading,
  assessing,
  assessError,
  canAssess,
  noLocation,
  onAssess,
  onDismissError,
  emptyTitle = 'Risk assessment has not been performed yet.',
  emptyDescription = 'Run an assistive risk assessment for this incident\u2019s location.',
}: RiskPanelProps) {
  const latest = assessments[0]

  return (
    <Card>
      <CardHeader
        title="AI risk assessment"
        description="Assistive analysis from stored incident and area data."
        action={
          canAssess && !noLocation ? (
            <Button size="sm" variant="outline" onClick={onAssess} disabled={assessing || loading}>
              {assessing ? 'Assessing…' : 'Assess risk'}
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        {loading && (
          <span className="flex items-center gap-2 text-sm text-ink-500">
            <Spinner size="sm" /> Loading assessments…
          </span>
        )}
        {!loading && noLocation && (
          <p className="text-sm text-ink-500">
            No stored coordinates for this incident, so no assessment can be produced.
          </p>
        )}
        {!loading && !noLocation && assessError && (
          <div className="space-y-3">
            <Alert variant="danger" title="Risk assessment temporarily unavailable" onClose={onDismissError}>
              {assessError}
            </Alert>
            {canAssess && (
              <Button size="sm" variant="primary" onClick={onAssess} disabled={assessing}>
                {assessing ? 'Assessing…' : 'Try Again'}
              </Button>
            )}
          </div>
        )}
        {assessing && (
          <span className="flex items-center gap-2 text-sm text-ink-500">
            <Spinner size="sm" /> Assessing incident risk…
          </span>
        )}
        {!loading && !noLocation && !assessError && assessments.length === 0 && (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              canAssess ? (
                <Button size="sm" variant="primary" onClick={onAssess} disabled={assessing}>
                  {assessing ? 'Assessing…' : 'Assess risk'}
                </Button>
              ) : undefined
            }
          />
        )}
        {!loading && latest && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Risk Score</p>
                <p className="text-4xl font-extrabold text-ink-900">
                  {latest.riskScore}
                  <span className="text-lg font-semibold text-ink-400"> / 100</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Risk Level</p>
                <div className="mt-1">
                  <Badge variant={riskLevelVariant(latest.riskLevel)} dot>
                    {latest.riskLevel}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink-400">
                  Model: {latest.modelVersion} · Assessed: {formatDateTime(latest.assessedAt)}
                </p>
              </div>
            </div>
            {latest.inputFactors.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Risk factors</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {latest.inputFactors.map((f) => (
                    <li key={f.factor} className="flex items-center justify-between gap-2 text-ink-600">
                      <span>
                        {factorLabel(f.factor)}:{' '}
                        <span className="font-semibold text-ink-800">{f.value}</span>
                      </span>
                      <span className="text-xs text-ink-400">+{f.weight}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">
                  Risk level is calculated from the incident priority, incident type and
                  verified safety information available around the reported location.
                </p>
              </div>
            )}
            {assessments.length > 1 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Previous</p>
                <ul className="mt-1 space-y-1 text-sm text-ink-500">
                  {assessments.slice(1, 4).map((a) => (
                    <li key={a.id}>
                      {a.riskScore} ({a.riskLevel}) · {formatDateTime(a.assessedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Alert variant="warning" title="Decision support only">
              This score is an assistive risk assessment based on available stored data and
              does not replace professional emergency judgement.
            </Alert>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
