import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { useHashIncidentId } from '../lib/hash-route'
import { getAdminIncidentNearbyResources, type NearbyResource } from '../lib/resources'
import { NearbyResourcesSection } from '../components/resources/NearbyResourcesSection'
import {
  ASSIGNMENT_STATUSES,
  assignmentBadgeVariant,
  formatDateTime as formatAssignmentDate,
  type Assignment,
} from '../lib/assignments'
import {
  formatDateTime,
  statusBadgeVariant,
  type Incident,
  type IncidentLocation,
} from '../lib/incidents'
import { useToast } from '../components/ui/toast-context'
import { HistoryTimeline, type HistoryEntry } from '../components/incidents/HistoryTimeline'
import { RiskPanel } from '../components/risks/RiskPanel'
import type { RiskAssessment } from '../lib/risks'
import { Alert } from '../components/ui/Alert'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Textarea } from '../components/ui/Textarea'

interface Reporter {
  id: string
  name: string
  email: string
  phone: string
  role: string
}

interface TeamOption {
  id: string
  name: string
  teamType: string
}

interface DetailResponse {
  incident: Incident
  reporter: Reporter | null
  location: IncidentLocation | null
  updates: HistoryEntry[]
  assignments: Assignment[]
}

const STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']

function priorityBadgeVariant(priority: string): BadgeVariant {
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

export function AdminIncidentDetailPage() {
  const { t } = useI18n()
  const incidentId = useHashIncidentId()
  const { notify } = useToast()
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [assignTeamId, setAssignTeamId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignFieldErrors, setAssignFieldErrors] = useState<Record<string, string>>({})
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({})
  const [rowSaving, setRowSaving] = useState<Record<string, boolean>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [assessments, setAssessments] = useState<RiskAssessment[]>([])
  const [nearby, setNearby] = useState<NearbyResource[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null)

  const loadNearby = useCallback(
    async (signal?: AbortSignal) => {
      if (!incidentId) return
      setNearbyLoading(true)
      setNearbyError(null)
      setNearbyNotice(null)
      try {
        const res = await getAdminIncidentNearbyResources(incidentId, signal)
        if (signal?.aborted) return
        setNearby(res.resources)
        setNearbyNotice(
          res.external && res.external.enabled && res.external.status === 'error'
            ? t('nearby.externalUnavailable')
            : null,
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!signal?.aborted) {
          setNearbyError(err instanceof ApiError ? err.message : t('nearby.loadError'))
        }
      } finally {
        if (!signal?.aborted) setNearbyLoading(false)
      }
    },
    [incidentId, t],
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
        const [res, teamList, riskList] = await Promise.all([
          api<DetailResponse>(`/admin/incidents/${incidentId}`, opts),
          api<{ teams: TeamOption[] }>('/admin/rescue-teams?isActive=true&limit=50', opts),
          api<{ assessments: RiskAssessment[] }>(`/admin/incidents/${incidentId}/risk`, opts),
        ])
        setDetail(res)
        setNewStatus(res.incident.status)
        setTeams(teamList.teams)
        setAssessments(riskList.assessments)
        const initial: Record<string, string> = {}
        for (const a of res.assignments) initial[a.id] = a.status
        setRowStatus(initial)
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
    [incidentId],
  )

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    if (loading || failed || notFound || !detail?.location) return
    const controller = new AbortController()
    void loadNearby(controller.signal)
    return () => controller.abort()
  }, [loading, failed, notFound, detail, loadNearby])

  async function onStatusSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!incidentId) return
    setSaving(true)
    setFormError(null)
    try {
      await api(`/admin/incidents/${incidentId}/status`, {
        method: 'PATCH',
        body: { status: newStatus, ...(comment.trim() ? { comment: comment.trim() } : {}) },
      })
      notify({ title: 'Status updated', description: `Incident is now ${newStatus}.`, variant: 'success' })
      setComment('')
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not update status. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function fieldErrorsFrom(details: unknown): Record<string, string> {
    const out: Record<string, string> = {}
    if (Array.isArray(details)) {
      for (const item of details) {
        if (
          typeof item === 'object' &&
          item !== null &&
          'field' in item &&
          'message' in item &&
          typeof (item as { field: unknown }).field === 'string' &&
          typeof (item as { message: unknown }).message === 'string'
        ) {
          out[(item as { field: string }).field] = (item as { message: string }).message
        }
      }
    }
    return out
  }

  async function onAssignSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!incidentId) return
    setAssigning(true)
    setAssignError(null)
    setAssignFieldErrors({})
    try {
      await api(`/admin/incidents/${incidentId}/assignments`, {
        method: 'POST',
        body: {
          teamId: assignTeamId,
          ...(assignNotes.trim() ? { notes: assignNotes.trim() } : {}),
        },
      })
      notify({ title: 'Team assigned', variant: 'success' })
      setAssignTeamId('')
      setAssignNotes('')
      await load()
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = fieldErrorsFrom(err.details)
        if (Object.keys(fields).length > 0) {
          setAssignFieldErrors(fields)
        } else {
          setAssignError(err.message)
        }
      } else {
        setAssignError('Could not create assignment. Please try again.')
      }
    } finally {
      setAssigning(false)
    }
  }

  async function onRowStatusSave(a: Assignment): Promise<void> {
    const next = rowStatus[a.id] ?? a.status
    setRowSaving((prev) => ({ ...prev, [a.id]: true }))
    setRowErrors((prev) => {
      const copy = { ...prev }
      delete copy[a.id]
      return copy
    })
    try {
      await api(`/admin/assignments/${a.id}`, { method: 'PATCH', body: { status: next } })
      notify({ title: 'Assignment updated', description: `Now ${next}.`, variant: 'success' })
      await load()
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [a.id]: err instanceof ApiError ? err.message : 'Could not update. Please try again.',
      }))
    } finally {
      setRowSaving((prev) => ({ ...prev, [a.id]: false }))
    }
  }

  const incident = detail?.incident ?? null

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <div>
        <a href="#/admin/incidents" className="text-sm font-semibold text-gold-700 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200">
          ← Back to incidents
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
          description={notFound ? 'No incident exists with this reference.' : 'The server could not be reached.'}
          onRetry={() => void load()}
        />
      )}

      {!loading && !failed && !notFound && incident && detail && (
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

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="Reporter" description="Account that raised this SOS." />
              <CardBody>
                {detail.reporter ? (
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-ink-500">Name</dt>
                      <dd className="mt-0.5 text-ink-900">{detail.reporter.name}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink-500">Email</dt>
                      <dd className="mt-0.5 break-all text-ink-900">{detail.reporter.email}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink-500">Phone</dt>
                      <dd className="mt-0.5 text-ink-900">{detail.reporter.phone}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-ink-500">Reporter account is no longer available.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Location" description="Attached coordinates, if provided." />
              <CardBody>
                {detail.location ? (
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-ink-500">Coordinates</dt>
                      <dd className="mt-0.5 text-ink-900">
                        {detail.location.latitude.toFixed(6)}, {detail.location.longitude.toFixed(6)}
                        {detail.location.accuracy !== undefined &&
                          ` (±${Math.round(detail.location.accuracy)} m)`}
                      </dd>
                    </div>
                    {(detail.location.address ?? detail.location.city ?? detail.location.state ?? detail.location.country) && (
                      <div>
                        <dt className="font-semibold text-ink-500">Area</dt>
                        <dd className="mt-0.5 text-ink-900">
                          {[detail.location.address, detail.location.city, detail.location.state, detail.location.country]
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
          </div>

          {!loading && !failed && !notFound && incident && detail && detail.location && (
            <NearbyResourcesSection
              resources={nearby}
              loading={nearbyLoading}
              loadError={nearbyError}
              onRetry={() => void loadNearby()}
              showCoordinates
              notice={nearbyNotice}
              titleKey="nearby.recordedLocation"
            />
          )}
          {!loading && !failed && !notFound && incident && detail && !detail.location && (
            <Card>
              <CardHeader title={t('nearby.recordedLocation')} />
              <CardBody>
                <p className="text-sm text-ink-500">{t('nearby.noIncidentLocation')}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Update status" description="Follows REPORTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED (CANCELLED where applicable). Every change is recorded in history." />
            <CardBody>
              <form className="space-y-4" noValidate onSubmit={(e: FormEvent) => void onStatusSubmit(e)}>
                {formError && (
                  <Alert variant="danger" title="Status update failed" onClose={() => setFormError(null)}>
                    {formError}
                  </Alert>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="New status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    options={STATUSES.map((s) => ({ label: s, value: s }))}
                  />
                  <Textarea
                    label="Comment (optional)"
                    rows={2}
                    placeholder="Reason or note for the history record…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={saving} disabled={saving}>
                  Apply status change
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Assignments"
              description="Assign a registered, active rescue team. Statuses follow ASSIGNED → EN_ROUTE → ON_SCENE → COMPLETED (CANCELLED where applicable) — recorded movement only."
            />
            <CardBody>
              <div className="space-y-4">
                {detail.assignments.length === 0 ? (
                  <EmptyState
                    title="No team assigned yet"
                    description="Use the form below to assign a rescue team to this incident."
                  />
                ) : (
                  <ul className="space-y-3">
                    {detail.assignments.map((a) => (
                      <li key={a.id} className="rounded-xl border border-ink-200/70 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={assignmentBadgeVariant(a.status)} dot>
                            {a.status}
                          </Badge>
                          <span className="text-sm font-bold text-ink-900">
                            {a.team ? `${a.team.name} (${a.team.teamType})` : 'Unknown team'}
                          </span>
                        </div>
                        {a.team && (
                          <p className="mt-1 text-sm text-ink-500">Contact: {a.team.phone}</p>
                        )}
                        {a.notes && <p className="mt-1 text-sm text-ink-700">{a.notes}</p>}
                        <p className="mt-1 text-xs text-ink-400">
                          Assigned {formatAssignmentDate(a.assignedAt)}
                        </p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1 sm:max-w-xs">
                            <Select
                              aria-label={`Assignment status for ${a.team?.name ?? a.id}`}
                              value={rowStatus[a.id] ?? a.status}
                              onChange={(e) => setRowStatus((prev) => ({ ...prev, [a.id]: e.target.value }))}
                              options={ASSIGNMENT_STATUSES.map((s) => ({ label: s, value: s }))}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={rowSaving[a.id] ?? false}
                            disabled={(rowSaving[a.id] ?? false) || (rowStatus[a.id] ?? a.status) === a.status}
                            onClick={() => void onRowStatusSave(a)}
                          >
                            Update status
                          </Button>
                        </div>
                        {rowErrors[a.id] && (
                          <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
                            {rowErrors[a.id]}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <form className="space-y-3 rounded-xl border border-dashed border-ink-300 bg-cream-50 p-4" noValidate onSubmit={(e: FormEvent) => void onAssignSubmit(e)}>
                  <p className="text-sm font-bold text-ink-900">Assign a team</p>
                  {assignError && (
                    <Alert variant="danger" title="Assignment failed" onClose={() => setAssignError(null)}>
                      {assignError}
                    </Alert>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label="Rescue team"
                      requiredMark
                      value={assignTeamId}
                      error={assignFieldErrors.teamId}
                      onChange={(e) => setAssignTeamId(e.target.value)}
                      placeholder="Select team"
                      options={teams.map((t) => ({ label: `${t.name} (${t.teamType})`, value: t.id }))}
                    />
                    <Input
                      label="Notes (optional)"
                      placeholder="Staging point, contact person…"
                      value={assignNotes}
                      error={assignFieldErrors.notes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                    />
                  </div>
                  <Button type="submit" loading={assigning} disabled={assigning}>
                    Assign team
                  </Button>
                </form>
              </div>
            </CardBody>
          </Card>

          <RiskPanel
            assessments={assessments}
            loading={loading}
            assessing={false}
            assessError={null}
            canAssess={false}
            noLocation={!loading && detail.incident.locationId === undefined}
            onAssess={() => undefined}
            onDismissError={() => undefined}
          />

          <Card>
            <CardHeader title="History" description="Every recorded status change, oldest first." />
            <CardBody>
              {detail.updates.length === 0 ? (
                <EmptyState
                  title="No updates yet"
                  description="Status changes made here will be recorded in this timeline."
                />
              ) : (
                <HistoryTimeline entries={detail.updates} />
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
