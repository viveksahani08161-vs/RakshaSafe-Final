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
}

/**
 * Assistive AI risk display. Results are always labeled as assessments with
 * an explicit disclaimer — never presented as guaranteed truth.
 */
export function RiskPanel({
  assessments,
  loading,
  assessing,
  assessError,
  canAssess,
  noLocation,
  onAssess,
  onDismissError,
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
          <Alert variant="danger" title="Assessment unavailable" onClose={onDismissError}>
            {assessError}
          </Alert>
        )}
        {!loading && !noLocation && !assessError && assessments.length === 0 && (
          <EmptyState
            title="No assessment yet"
            description="Run an assistive risk assessment for this incident's location."
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
              <p className="text-4xl font-extrabold text-ink-900">{latest.riskScore}</p>
              <div>
                <Badge variant={riskLevelVariant(latest.riskLevel)} dot>
                  {latest.riskLevel}
                </Badge>
                <p className="mt-1 text-xs text-ink-400">
                  {latest.modelVersion} · {formatDateTime(latest.assessedAt)}
                </p>
              </div>
            </div>
            {latest.inputFactors.length > 0 && (
              <ul className="space-y-1 text-sm">
                {latest.inputFactors.map((f) => (
                  <li key={f.factor} className="flex items-center justify-between gap-2 text-ink-600">
                    <span>
                      {f.factor}: <span className="font-semibold text-ink-800">{f.value}</span>
                    </span>
                    <span className="text-xs text-ink-400">+{f.weight}</span>
                  </li>
                ))}
              </ul>
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
              This score assists review. It predicts nothing, dispatches no one, and never
              replaces professional emergency assessment.
            </Alert>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
