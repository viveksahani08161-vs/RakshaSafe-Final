import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { navigateTo, useHashUserIncidentId } from '../lib/hash-route'
import { assignmentBadgeVariant, type AssignmentTeam } from '../lib/assignments'
import {
  formatDateTime,
  INCIDENT_CATEGORIES,
  statusBadgeVariant,
  type Incident,
  type IncidentLocation,
} from '../lib/incidents'
import { getIncidentNearbyResources, buildTelHref, type NearbyResource } from '../lib/resources'
import { useEnrichment } from '../lib/useEnrichment'
import type { RiskAssessment } from '../lib/risks'
import { LocationEnrichment } from '../components/enrichment/LocationEnrichment'
import { LocationDetail } from '../components/location/LocationDetail'
import { NearbyResourcesSection } from '../components/resources/NearbyResourcesSection'
import { HistoryTimeline, type HistoryEntry } from '../components/incidents/HistoryTimeline'
import { RiskPanel } from '../components/risks/RiskPanel'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Textarea } from '../components/ui/Textarea'
import { useToast } from '../components/ui/toast-context'

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
  const { t } = useI18n()
  const { notify } = useToast()
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
  const [nearby, setNearby] = useState<NearbyResource[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null)
  const detailEnrichment = useEnrichment(
    location?.latitude ?? null,
    location?.longitude ?? null,
    !loading && !failed && !notFound && incident !== null,
  )

  const loadNearby = useCallback(
    async (signal?: AbortSignal) => {
      if (!incidentId) return
      setNearbyLoading(true)
      setNearbyError(null)
      setNearbyNotice(null)
      try {
        const res = await getIncidentNearbyResources(incidentId, signal)
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

  const [editOpen, setEditOpen] = useState(false)
  const [editType, setEditType] = useState('Safety')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('LOW')
  const [editErrors, setEditErrors] = useState<{
    type?: string
    category?: string
    description?: string
    priority?: string
  }>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canManage =
    incident !== null &&
    (incident.status === 'REPORTED' || incident.status === 'ACKNOWLEDGED') &&
    assignments.length === 0

  function openEdit(): void {
    if (!incident) return
    setEditType(incident.type)
    setEditCategory(incident.category)
    setEditDescription(incident.description)
    setEditPriority(incident.priority)
    setEditErrors({})
    setEditSubmitError(null)
    setEditOpen(true)
  }

  async function onSaveEdit(): Promise<void> {
    if (!incidentId || !incident || editSaving) return
    const errs: typeof editErrors = {}
    if (!editType) errs.type = 'Please select an incident type.'
    if (editCategory.trim().length < 2) errs.category = 'Category must be at least 2 characters.'
    if (editDescription.trim().length < 1) errs.description = 'Description cannot be empty.'
    if (!editPriority) errs.priority = 'Please select a priority.'
    if (errs.type || errs.category || errs.description || errs.priority) {
      setEditErrors(errs)
      return
    }
    setEditErrors({})
    setEditSaving(true)
    setEditSubmitError(null)
    try {
      const res = await api<{ incident: Incident }>(`/incidents/${incidentId}`, {
        method: 'PATCH',
        body: {
          type: editType,
          category: editCategory.trim(),
          description: editDescription.trim(),
          priority: editPriority,
        },
      })
      setIncident(res.incident)
      setEditOpen(false)
      notify({ title: t('incident.editSuccess'), variant: 'success' })
    } catch (err) {
      setEditSubmitError(err instanceof ApiError ? err.message : t('incident.editError'))
    } finally {
      setEditSaving(false)
    }
  }

  async function onDelete(): Promise<void> {
    if (!incidentId || deleteLoading) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await api<{ deleted: boolean }>(`/incidents/${incidentId}`, { method: 'DELETE' })
      setDeleteLoading(false)
      notify({ title: t('incident.deleteSuccess'), variant: 'success' })
      navigateTo('/dashboard')
    } catch (err) {
      setDeleteLoading(false)
      setDeleteError(err instanceof ApiError ? err.message : t('incident.deleteError'))
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

  useEffect(() => {
    if (loading || failed || notFound || !incident || !location) return
    const controller = new AbortController()
    void loadNearby(controller.signal)
    return () => controller.abort()
  }, [loading, failed, notFound, incident, location, loadNearby])

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <a href="#/dashboard" className="text-sm font-semibold text-gold-700 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200">
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
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && (
                    <>
                      <Button size="sm" variant="outline" onClick={openEdit}>
                        {t('incident.edit')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
                        {t('incident.delete')}
                      </Button>
                    </>
                  )}
                  <Badge variant={statusBadgeVariant(incident.status)} dot>
                    {incident.status}
                  </Badge>
                </div>
              }
            />
            <CardBody>
              {!canManage && <Alert variant="info">{t('incident.editBlocked')}</Alert>}
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
            <CardHeader title="Location" description="Captured from your device when permission was granted." />
            <CardBody>
              {location ? (
                <LocationDetail
                  location={location}
                  liveAddress={detailEnrichment.address?.displayName ?? null}
                  addressLoading={detailEnrichment.addressLoading}
                />
              ) : (
                <p className="text-sm text-ink-500">
                  No location was captured for this incident. Allow location access when
                  reporting so responders can see where help is needed — other features
                  keep working without it.
                </p>
              )}
            </CardBody>
          </Card>

          {!loading && location && (
            <LocationEnrichment
              latitude={location.latitude}
              longitude={location.longitude}
              accuracy={location.accuracy}
              enrichment={detailEnrichment}
            />
          )}
          {!loading && location && (
            <NearbyResourcesSection
              resources={nearby}
              loading={nearbyLoading}
              loadError={nearbyError}
              onRetry={() => void loadNearby()}
              notice={nearbyNotice}
              titleKey="nearby.recordedLocation"
            />
          )}
          {!loading && !location && (
            <Card>
              <CardHeader title={t('nearby.recordedLocation')} />
              <CardBody>
                <p className="text-sm text-ink-500">{t('nearby.noIncidentLocation')}</p>
              </CardBody>
            </Card>
          )}

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
                      {a.team &&
                        (a.team.phone ? (
                          <p className="mt-1 text-sm text-ink-500">
                            Contact:{' '}
                            <a href={buildTelHref(a.team.phone)} className="hover:text-gold-700 underline-offset-2 hover:underline">
                              {a.team.phone}
                            </a>
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-ink-400">Contact not available</p>
                        ))}
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

      <Modal
        open={editOpen}
        onClose={() => {
          if (!editSaving) {
            setEditOpen(false)
            setEditSubmitError(null)
          }
        }}
        title={t('incident.editTitle')}
        size="lg"
        footer={
          <>
            <Button variant="outline" disabled={editSaving} onClick={() => setEditOpen(false)}>
              {t('incident.cancel')}
            </Button>
            <Button loading={editSaving} onClick={() => void onSaveEdit()}>
              {t('incident.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editSubmitError && <Alert variant="danger">{editSubmitError}</Alert>}
          <Select
            label={t('incident.type')}
            placeholder="Select type"
            requiredMark
            value={editType}
            error={editErrors.type}
            onChange={(e) => setEditType(e.target.value)}
            options={[
              { label: 'Safety', value: 'Safety' },
              { label: 'Disaster', value: 'Disaster' },
            ]}
          />
          <Select
            label={t('incident.category')}
            placeholder="Select category"
            requiredMark
            value={editCategory}
            error={editErrors.category}
            onChange={(e) => setEditCategory(e.target.value)}
            options={INCIDENT_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
          <Textarea
            label={t('incident.description')}
            rows={4}
            requiredMark
            value={editDescription}
            error={editErrors.description}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <Select
            label={t('incident.priority')}
            placeholder="Select priority"
            requiredMark
            value={editPriority}
            error={editErrors.priority}
            onChange={(e) => setEditPriority(e.target.value)}
            options={[
              { label: 'Low', value: 'LOW' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'High', value: 'HIGH' },
              { label: 'Critical', value: 'CRITICAL' },
            ]}
          />
        </div>
      </Modal>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteOpen(false)
            setDeleteError(null)
          }
        }}
        variant="danger"
        title={t('incident.deleteTitle')}
        description={t('incident.deleteHelper')}
        cancelLabel={t('incident.cancel')}
        confirmLabel={t('incident.delete')}
        confirmLoading={deleteLoading}
        onConfirm={() => void onDelete()}
      >
        {deleteError ? (
          <p className="text-sm leading-relaxed text-rose-700 dark:text-rose-400">{deleteError}</p>
        ) : (
          t('incident.deleteConfirm')
        )}
      </Dialog>
    </div>
  )
}
