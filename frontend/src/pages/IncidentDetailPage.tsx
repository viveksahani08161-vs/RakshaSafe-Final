import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useHashUserIncidentId } from '../lib/hash-route'
import { assignmentBadgeVariant, type AssignmentTeam } from '../lib/assignments'
import { formatDateTime, statusBadgeVariant, type Incident, type IncidentLocation } from '../lib/incidents'
import type { RiskAssessment } from '../lib/risks'
import { HistoryTimeline, type HistoryEntry } from '../components/incidents/HistoryTimeline'
import { RiskPanel } from '../components/risks/RiskPanel'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'

interface UserAssignment {
  id: string
  team: AssignmentTeam | null
  status: string
  assignedAt: string
}

interface DetailResponse {
  incident: Incident
  location: IncidentLocation | null
  assignments: UserAssignment[]
}

function priorityBadgeVariant(priority: string): 'danger' | 'warning' | 'secondary' | 'neutral' {
  switch (priority) {
    case 'CRITICAL':
      return 'danger'
    case 'HIGH':
      return 'warning'
    case 'MEDIUM':
      return 'secondary'
    case 'LOW':
    default:
      return 'neutral'
  }
}

export function IncidentDetailPage() {
  const incidentId = useHashUserIncidentId()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [location, setLocation] = useState<IncidentLocation | null>(null)
  const [assignments, setAssignments] = useState<UserAssignment[]>([])
  const [assessments, setAssessments] = useState<RiskAssessment[]>([])
  const [riskLoading, setRiskLoading] = useState(true)
  const [assessing, setAssessing] = useState(false)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [updates, setUpdates] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const loadRisk = useCallback(
    async (signal?: AbortSignal) => {
      if (!incidentId) return
      setRiskLoading(true)
      try {
        const res = await api<{ assessments: RiskAssessment[] }>(
          `/incidents/${incidentId}/risk`,
          signal ? { signal } : {},
        )
        setAssessments(res.assessments)
      } catch {
        /* risk history is supplementary; the main error state covers failures */
      } finally {
        if (!signal?.aborted) setRiskLoading(false)
      }
    },
    [incidentId],
  )

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!incidentId) {
        setLoading(false)
        setFailed(true)
        return
      }
      setLoading(true)
      setFailed(false)
      setNotFound(false)
      try {
        const opts = signal ? { signal } : {}
        const [detail, history] = await Promise.all([
          api<DetailResponse>(`/incidents/${incidentId}`, opts),
          api<{ updates: HistoryEntry[] }>(`/incidents/${incidentId}/updates`, opts),
          loadRisk(signal),
        ])
        setIncident(detail.incident)
        setLocation(detail.location)
        setAssignments(detail.assignments)
        setUpdates(history.updates)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setFailed(true)
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [incidentId, loadRisk],
  )

  async function onAssess(): Promise<void> {
    if (!incidentId) return
    setAssessing(true)
    setAssessError(null)
    try {
      await api(`/incidents/${incidentId}/risk`, { method: 'POST' })
      await loadRisk()
    } catch (err) {
      setAssessError(err instanceof ApiError ? err.message : 'Assessment failed. Please try again.')
    } finally {
      setAssessing(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <a href="#/dashboard" className="text-sm font-semibold text-gold-700 hover:text-gold-800">
          ← Back to dashboard
        </a>
      </div>

      {loading && (
        <div className="space-y-2" aria-label="Loading incident">
          <Skeleton lines={6} />
        </div>
      )}

      {!loading && (failed || notFound) && (
        <ErrorState
          title={notFound ? 'Incident not found' : 'Could not load incident'}
          description={
            notFound
              ? 'This incident does not exist or is not yours.'
              : 'The server could not be reached. Check your connection and try again.'
          }
          onRetry={() => void load()}
        />
      )}

      {!loading && !failed && !notFound && incident && (
        <>
          <Card>
            <CardHeader
              title={incident.category}
              description={`Reference ${incident.id}`}
              action={
                <Badge variant={statusBadgeVariant(incident.status)} dot>
                  {incident.status}
                </Badge>
              }
            />
            <CardBody>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-ink-500">Type</dt>
                  <dd className="mt-0.5 text-ink-900">{incident.type}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-500">Priority</dt>
                  <dd className="mt-0.5">
                    <Badge variant={priorityBadgeVariant(incident.priority)}>{incident.priority}</Badge>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ink-500">Description</dt>
                  <dd className="mt-0.5 leading-relaxed text-ink-900">{incident.description}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-500">Reported</dt>
                  <dd className="mt-0.5 text-ink-900">{formatDateTime(incident.createdAt)}</dd>
                </div>
                {incident.resolvedAt && (
                  <div>
                    <dt className="font-semibold text-ink-500">Resolved</dt>
                    <dd className="mt-0.5 text-ink-900">{formatDateTime(incident.resolvedAt)}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Location" description="Coordinates captured from your device, if provided." />
            <CardBody>
              {location ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-ink-500">Coordinates</dt>
                    <dd className="mt-0.5 text-ink-900">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      {location.accuracy !== undefined && ` (±${Math.round(location.accuracy)} m)`}
                    </dd>
                  </div>
                  {(location.address ?? location.city ?? location.state ?? location.country) && (
                    <div>
                      <dt className="font-semibold text-ink-500">Area</dt>
                      <dd className="mt-0.5 text-ink-900">
                        {[location.address, location.city, location.state, location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-ink-500">No location was attached to this incident.</p>
              )}
            </CardBody>
          </Card>

          <RiskPanel
            assessments={assessments}
            loading={loading || riskLoading}
            assessing={assessing}
            assessError={assessError}
            canAssess={true}
            noLocation={!loading && location === null}
            onAssess={() => void onAssess()}
            onDismissError={() => setAssessError(null)}
          />

          {assignments.length > 0 && (
            <Card>
              <CardHeader title="Response assignment" description="Team assigned to your incident." />
              <CardBody>
                <ul className="space-y-3">
                  {assignments.map((a) => (
                    <li key={a.id} className="rounded-xl border border-ink-200/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={assignmentBadgeVariant(a.status)} dot>
                          {a.status}
                        </Badge>
                        <span className="text-sm font-bold text-ink-900">
                          {a.team ? `${a.team.name} (${a.team.teamType})` : 'Response team'}
                        </span>
                      </div>
                      {a.team && <p className="mt-1 text-sm text-ink-500">Contact: {a.team.phone}</p>}
                      <p className="mt-1 text-xs text-ink-400">Assigned {formatDateTime(a.assignedAt)}</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="History" description="Status changes recorded for this incident, oldest first." />
            <CardBody>
              {updates.length === 0 ? (
                <EmptyState
                  title="No updates yet"
                  description="Your incident is REPORTED. Updates appear here as administrators review it."
                />
              ) : (
                <HistoryTimeline entries={updates} />
              )}
              <Alert variant="info" title="About response">
                Status changes are made by administrators as your incident is reviewed. This app
                cannot guarantee physical response or arrival times.
              </Alert>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
