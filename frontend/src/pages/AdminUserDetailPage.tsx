import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { formatDateTime as formatIncidentDateTime, type Incident } from '../lib/incidents'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { useI18n } from '../lib/i18n'
import { hashUserId, navigateTo } from '../lib/hash-route'
import { useToast } from '../components/ui/toast-context'
import { ChevronLeftIcon, MapPinIcon, ShieldCheckIcon, AlertTriangleIcon, UsersIcon, BellIcon, ActivityIcon, FileTextIcon, ChevronRightIcon } from '../components/ui/icons'

interface AdminUserDetail {
  id: string
  name: string
  email: string
  phone: string
  role: string
  language?: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

interface AdminUserIncident extends Incident {
  location?: {
    latitude: number
    longitude: number
    address?: string
    city?: string
    state?: string
    country?: string
    accuracy?: number
  } | null
}

interface AdminUserAssignment {
  id: string
  incidentId: string
  team: {
    id: string
    name: string
    teamType: string
    phone: string
  } | null
  teamId: string
  assignedBy: string
  status: string
  assignedAt: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface AdminUserHistory {
  id: string
  incidentId: string
  statusFrom: string | null
  statusTo: string
  comment?: string
  updatedBy: string
  createdAt: string
}

interface AdminUserUnsafeReport {
  id: string
  category: string
  description: string
  severity: string
  isVerified: boolean
  locationId: string
  location?: {
    latitude: number
    longitude: number
    address?: string
    city?: string
    state?: string
    country?: string
    accuracy?: number
  } | null
  createdAt: string
  updatedAt: string
}

interface AdminUserNotification {
  id: string
  incidentId: string
  incident?: { id: string; category: string; status: string } | null
  contactId?: string
  contactName?: string
  channel: string
  status: string
  providerResponse?: string
  attemptCount: number
  lastAttemptAt?: string
  createdAt: string
  updatedAt: string
}

interface AdminUserDetailResponse {
  user: {
    id: string
    name: string
    email: string
    phone: string
    role: string
    language?: string
    createdAt: string
    updatedAt: string
  }
  incidents: AdminUserIncident[]
  assignments: AdminUserAssignment[]
  history: AdminUserHistory[]
  riskAssessments: {
    id: string
    locationId: string
    riskScore: number
    riskLevel: string
    modelVersion: string
    inputFactors: Record<string, unknown>[]
    assessedAt: string
    createdAt: string
  }[]
  notifications: AdminUserNotification[]
  unsafeReports: AdminUserUnsafeReport[]
}

interface AdminUserHistory {
  id: string
  incidentId: string
  statusFrom: string | null
  statusTo: string
  comment?: string
  updatedBy: string
  createdAt: string
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    low: 'secondary',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  const variant = variants[severity] ?? 'outline'
  return <Badge variant={variant}>{severity}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    REPORTED: 'secondary',
    ACKNOWLEDGED: 'warning',
    ASSIGNED: 'primary',
    IN_PROGRESS: 'primary',
    RESOLVED: 'success',
    CLOSED: 'success',
    CANCELLED: 'neutral',
  }
  const variant = variants[status] ?? 'outline'
  return <Badge variant={variant}>{status}</Badge>
}

function AssignmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    ASSIGNED: 'secondary',
    EN_ROUTE: 'warning',
    ON_SCENE: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'neutral',
  }
  const variant = variants[status] ?? 'outline'
  return <Badge variant={variant}>{status}</Badge>
}

function NotificationStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    QUEUED: 'secondary',
    SENT: 'primary',
    DELIVERED: 'success',
    FAILED: 'danger',
    NOT_CONFIGURED: 'warning',
    UNAVAILABLE: 'neutral',
  }
  const variant = variants[status] ?? 'outline'
  return <Badge variant={variant}>{status}</Badge>
}

function RiskLevelBadge({ level }: { level: string }) {
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    LOW: 'secondary',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger',
  }
  const variant = variants[level] ?? 'outline'
  return <Badge variant={variant}>{level}</Badge>
}

function formatFactors(factors: Record<string, unknown>[]): string {
  return factors
    .map((f) =>
      Object.entries(f)
        .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
        .join(', '),
    )
    .join(' · ')
}

function toFieldErrors(details: unknown): Record<string, string> {
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

export function AdminUserDetailPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const userId = hashUserId()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [incidents, setIncidents] = useState<AdminUserIncident[]>([])
  const [assignments, setAssignments] = useState<AdminUserAssignment[]>([])
  const [history, setHistory] = useState<AdminUserHistory[]>([])
  const [riskAssessments, setRiskAssessments] = useState<AdminUserDetailResponse['riskAssessments']>([])
  const [notifications, setNotifications] = useState<AdminUserNotification[]>([])
  const [unsafeReports, setUnsafeReports] = useState<AdminUserUnsafeReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'incidents' | 'assignments' | 'history' | 'risk' | 'notifications' | 'unsafeReports'>('incidents')

  const [editModal, setEditModal] = useState<{ user: AdminUserDetail | null }>({ user: null })
  const [deleteModal, setDeleteModal] = useState<{ user: AdminUserDetail | null }>({ user: null })
  const [form, setForm] = useState({ name: '', email: '', phone: '', language: '', role: '', isActive: true })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Activity statuses considered as "active" per existing workflow
  const ACTIVE_STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS']
  const RESOLVED_STATUSES = ['RESOLVED', 'CLOSED']

  // Compute activity summary from loaded data
  const totalIncidents = incidents.length
  const activeIncidents = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status)).length
  const resolvedIncidents = incidents.filter((i) => RESOLVED_STATUSES.includes(i.status)).length
  const cancelledIncidents = incidents.filter((i) => i.status === 'CANCELLED').length
  const totalUnsafeReports = unsafeReports.length
  const totalNotifications = notifications.length
  const totalAssignments = assignments.length
  const totalRiskAssessments = riskAssessments.length

  // Find latest incident with a stored location (incidents are sorted by createdAt desc)
  const latestIncidentWithLocation = incidents.find((i) => i.location !== null && i.location !== undefined)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api<AdminUserDetailResponse>(`/admin/users/${userId}`, signal ? { signal } : {})
      setUser(res.user)
      setIncidents(res.incidents)
      setAssignments(res.assignments)
      setHistory(res.history)
      setRiskAssessments(res.riskAssessments)
      setNotifications(res.notifications)
      setUnsafeReports(res.unsafeReports ?? [])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError(err instanceof ApiError ? err.message : 'Could not load user details.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  function handleBack(): void {
    navigateTo('/admin/users')
  }

  function openEditModal(): void {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        language: user.language ?? '',
        role: user.role,
        isActive: user.isActive !== undefined ? user.isActive : true,
      })
      setFieldErrors({})
      setFormError(null)
      setEditModal({ user })
    }
  }

  function openDeleteModal(): void {
    if (user) setDeleteModal({ user })
  }

  function parseRole(role: string): 'USER' | 'ADMIN' | 'RESPONDER' {
    return role as 'USER' | 'ADMIN' | 'RESPONDER'
  }

  async function onEditSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!editModal?.user) return
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: parseRole(form.role),
        isActive: form.isActive,
      }
      if (form.language.trim() !== '') body.language = form.language.trim()
      await api(`/admin/users/${editModal.user.id}`, { method: 'PATCH', body })
      notify({ title: t('admin.users.updateSuccess'), description: form.name.trim(), variant: 'success' })
      setEditModal({ user: null })
      await load()
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields)
        } else if (err.status === 400 && err.message.includes('last active administrator')) {
          setFormError(t('admin.users.lastAdminRole'))
        } else if (err.status === 400 && err.message.includes('your own admin role')) {
          setFormError(t('admin.users.cannotDemoteSelf'))
        } else if (err.status === 409 && err.message.includes('email')) {
          setFieldErrors({ email: t('admin.users.duplicateEmail') })
        } else if (err.status === 409 && err.message.includes('phone')) {
          setFieldErrors({ phone: t('admin.users.duplicatePhone') })
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(t('admin.users.updateError'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmDelete(): Promise<void> {
    if (!deleteModal?.user) return
    setDeleting(true)
    try {
      await api(`/admin/users/${deleteModal.user.id}`, { method: 'DELETE' })
      notify({ title: t('admin.users.deleteSuccess'), description: deleteModal.user.name, variant: 'success' })
      setDeleteModal({ user: null })
      navigateTo('/admin/users')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.message.includes('your own administrator account')) {
          notify({ title: t('admin.users.deleteError'), description: t('admin.users.cannotDeleteSelf'), variant: 'danger' })
        } else if (err.status === 400 && err.message.includes('last active administrator')) {
          notify({ title: t('admin.users.deleteError'), description: t('admin.users.lastAdmin'), variant: 'danger' })
        } else {
          notify({ title: t('admin.users.deleteError'), description: err.message, variant: 'danger' })
        }
      } else {
        notify({ title: t('admin.users.deleteError'), description: t('admin.users.deleteError'), variant: 'danger' })
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!userId) {
    return <div>Invalid user ID</div>
  }

  return (
    <>
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card>
        <CardHeader
          title={t('admin.users.viewUser')}
          description={user ? `${user.name} (${user.email})` : ''}
          action={
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ChevronLeftIcon className="size-4 mr-1" />
              {t('common.back')}
            </Button>
          }
        />
        <CardBody>
          {loading && <Skeleton lines={5} />}
          {!loading && loadError && (
            <ErrorState title={t('admin.users.loadError')} description={loadError} onRetry={() => void load()} />
          )}
          {user && !loading && !loadError && (
            <div className="space-y-6">
              {/* Profile Section */}
              <section aria-labelledby="profile-heading">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
                  <h2 id="profile-heading" className="text-lg font-bold text-ink-900">{t('admin.users.profile')}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={openEditModal}>
                      {t('admin.users.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={openDeleteModal}>
                      {t('admin.users.delete')}
                    </Button>
                  </div>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.users.name')}</dt>
                    <dd className="mt-0.5 text-ink-900">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.users.email')}</dt>
                    <dd className="mt-0.5 text-ink-900 break-all">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.users.phone')}</dt>
                    <dd className="mt-0.5 text-ink-900">{user.phone}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.users.role')}</dt>
                    <dd className="mt-0.5">
                      <Badge variant={user.role === 'ADMIN' ? 'secondary' : user.role === 'RESPONDER' ? 'primary' : 'outline'}>
                        {user.role}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.users.language')}</dt>
                    <dd className="mt-0.5 text-ink-900">{user.language ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.users.createdAt')}</dt>
                    <dd className="mt-0.5 text-ink-900">{formatIncidentDateTime(user.createdAt)}</dd>
                  </div>
                </dl>
              </section>

              {/* Activity Summary Cards */}
              <section aria-labelledby="activity-summary-heading">
                <h2 id="activity-summary-heading" className="text-lg font-bold text-ink-900 mb-4">{t('admin.users.activitySummary')}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
                        <ActivityIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalIncidents}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.totalIncidents')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                        <AlertTriangleIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{activeIncidents}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.activeIncidents')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <ShieldCheckIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{resolvedIncidents}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.resolvedIncidents')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                        <ChevronRightIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{cancelledIncidents}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.cancelledIncidents')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                        <AlertTriangleIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalUnsafeReports}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.totalUnsafeReports')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                        <BellIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalNotifications}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.totalNotifications')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                        <UsersIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalAssignments}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.totalAssignments')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <FileTextIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalRiskAssessments}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.totalRiskAssessments')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Latest Recorded Incident Location */}
              <section aria-labelledby="latest-location-heading">
                <h2 id="latest-location-heading" className="text-lg font-bold text-ink-900 mb-4">{t('admin.users.latestRecordedLocation')}</h2>
                <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                  {latestIncidentWithLocation?.location ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="font-semibold text-ink-500">{t('admin.users.latestLocationIncident')}</dt>
                        <dd className="mt-0.5 text-ink-900 font-mono text-sm">{latestIncidentWithLocation.id}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink-500">{t('admin.users.latestLocationRecordedAt')}</dt>
                        <dd className="mt-0.5 text-ink-900">{formatIncidentDateTime(latestIncidentWithLocation.createdAt)}</dd>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="font-semibold text-ink-500">{t('admin.users.location')}</dt>
                        <dd className="mt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <MapPinIcon className="size-4 text-ink-400 shrink-0" />
                            <span className="font-mono text-sm text-ink-900">
                              {latestIncidentWithLocation.location!.latitude.toFixed(6)}, {latestIncidentWithLocation.location!.longitude.toFixed(6)}
                            </span>
                            {latestIncidentWithLocation.location!.accuracy !== undefined && (
                              <span className="text-xs text-ink-500">±{Math.round(latestIncidentWithLocation.location!.accuracy)}m</span>
                            )}
                          </div>
                          {latestIncidentWithLocation.location!.address && (
                            <div className="mt-1 text-sm text-ink-600">{latestIncidentWithLocation.location!.address}</div>
                          )}
                          {latestIncidentWithLocation.location!.city && (
                            <div className="text-sm text-ink-600">{latestIncidentWithLocation.location!.city}{latestIncidentWithLocation.location!.state ? `, ${latestIncidentWithLocation.location!.state}` : ''}{latestIncidentWithLocation.location!.country ? `, ${latestIncidentWithLocation.location!.country}` : ''}</div>
                          )}
                        </dd>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-ink-500">
                      <MapPinIcon className="size-8 mx-auto text-ink-300 mb-2" />
                      <p>{t('admin.users.noRecordedLocation')}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Service Usage */}
              <section aria-labelledby="service-usage-heading">
                <h2 id="service-usage-heading" className="text-lg font-bold text-ink-900 mb-4">{t('admin.users.serviceUsage')}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
                        <ActivityIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalIncidents}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.incidentsCreated')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                        <AlertTriangleIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalUnsafeReports}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.unsafeReportsCreated')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                        <UsersIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">—</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.emergencyContactsCount')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                        <UsersIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalAssignments}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.rescueAssignmentsReceived')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                        <BellIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalNotifications}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.notificationsGenerated')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-ink-200/70 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <FileTextIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-ink-900">{totalRiskAssessments}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('admin.users.riskAssessmentsAssociated')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Tab navigation */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 border-b border-ink-200 pb-2" role="tablist" aria-label={t('admin.users.sections')}>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'incidents'}
                    onClick={() => setActiveTab('incidents')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === 'incidents'
                        ? 'bg-cream-100 text-gold-700 border-b-2 border-gold-500'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t('admin.users.incidents')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'assignments'}
                    onClick={() => setActiveTab('assignments')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === 'assignments'
                        ? 'bg-cream-100 text-gold-700 border-b-2 border-gold-500'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t('admin.users.assignments')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === 'history'
                        ? 'bg-cream-100 text-gold-700 border-b-2 border-gold-500'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t('admin.users.history')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'risk'}
                    onClick={() => setActiveTab('risk')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === 'risk'
                        ? 'bg-cream-100 text-gold-700 border-b-2 border-gold-500'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t('admin.users.riskAssessments')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'notifications'}
                    onClick={() => setActiveTab('notifications')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === 'notifications'
                        ? 'bg-cream-100 text-gold-700 border-b-2 border-gold-500'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t('admin.users.notifications')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'unsafeReports'}
                    onClick={() => setActiveTab('unsafeReports')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === 'unsafeReports'
                        ? 'bg-cream-100 text-gold-700 border-b-2 border-gold-500'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t('admin.users.unsafeReports')}
                  </button>
                </div>
              </div>

              {/* Incidents Tab */}
              {activeTab === 'incidents' && (
                <div className="mt-4">
                  {loading && <Skeleton lines={5} />}
                  {!loading && incidents.length === 0 && (
                    <EmptyState title={t('admin.users.noIncidents')} description={t('admin.users.noIncidentsDesc')} />
                  )}
                  {!loading && incidents.length > 0 && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t('admin.users.incidentId')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.type')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.category')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.descriptionLabel')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.priority')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.status')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.location')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.createdAt')}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {incidents.map((inc) => (
                          <TableRow key={inc.id}>
                            <TableCell>
                              <span className="font-medium text-ink-900">{inc.id}</span>
                            </TableCell>
                            <TableCell>{inc.type}</TableCell>
                            <TableCell>{inc.category}</TableCell>
                            <TableCell className="max-w-xs truncate text-ink-500">{inc.description || '-'}</TableCell>
                            <TableCell><SeverityBadge severity={inc.priority} /></TableCell>
                            <TableCell><StatusBadge status={inc.status} /></TableCell>
                            <TableCell className="text-ink-500">
                              {inc.location
                                ? (
                                  <>
                                    <span className="font-mono text-xs">
                                      {inc.location.latitude.toFixed(4)}, {inc.location.longitude.toFixed(4)}
                                    </span>
                                    {inc.location.address ? <div className="text-xs">{inc.location.address}</div> : null}
                                    {inc.location.accuracy !== undefined ? (
                                      <div className="text-xs">±{inc.location.accuracy.toFixed(0)}m</div>
                                    ) : null}
                                  </>
                                )
                                : t('admin.users.noLocation')}
                            </TableCell>
                            <TableCell>{formatIncidentDateTime(inc.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === 'assignments' && (
                <div className="mt-4">
                  {loading && <Skeleton lines={5} />}
                  {!loading && assignments.length === 0 && (
                    <EmptyState title={t('admin.users.noAssignments')} description={t('admin.users.noAssignmentsDesc')} />
                  )}
                  {!loading && assignments.length > 0 && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t('admin.users.team')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.teamType')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.incidentId')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.status')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.assignedAt')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.completedAt')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.notes')}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assignments.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <span className="font-medium text-ink-900">{a.team?.name ?? t('admin.users.noTeam')}</span>
                            </TableCell>
                            <TableCell>{a.team?.teamType ?? '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{a.incidentId}</TableCell>
                            <TableCell><AssignmentStatusBadge status={a.status} /></TableCell>
                            <TableCell>{formatIncidentDateTime(a.assignedAt)}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell className="text-ink-500 max-w-xs truncate">{a.notes ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="mt-4">
                  {loading && <Skeleton lines={5} />}
                  {!loading && history.length === 0 && (
                    <EmptyState title={t('admin.users.noHistory')} description={t('admin.users.noHistoryDesc')} />
                  )}
                  {!loading && history.length > 0 && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t('admin.users.incidentId')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.statusChange')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.updatedBy')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.timestamp')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.comment')}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-mono text-sm">{h.incidentId}</TableCell>
                            <TableCell>
                              {h.statusFrom ? (
                                <>
                                  <span className="font-medium">{h.statusFrom}</span>
                                  <span className="mx-1 text-ink-400">→</span>
                                  <span className="font-medium">{h.statusTo}</span>
                                </>
                              ) : (
                                <span className="font-medium">{h.statusTo}</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{h.updatedBy}</TableCell>
                            <TableCell>{formatIncidentDateTime(h.createdAt)}</TableCell>
                            <TableCell className="text-ink-500 max-w-xs truncate">{h.comment ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Risk Assessments Tab */}
              {activeTab === 'risk' && (
                <div className="mt-4">
                  {loading && <Skeleton lines={5} />}
                  {!loading && riskAssessments.length === 0 && (
                    <EmptyState title={t('admin.users.noRiskAssessments')} description={t('admin.users.noRiskAssessmentsDesc')} />
                  )}
                  {!loading && riskAssessments.length > 0 && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t('admin.users.locationId')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.riskScore')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.riskLevel')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.modelVersion')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.factors')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.assessedAt')}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {riskAssessments.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-sm">{r.locationId}</TableCell>
                            <TableCell>{r.riskScore}</TableCell>
                            <TableCell><RiskLevelBadge level={r.riskLevel} /></TableCell>
                            <TableCell>{r.modelVersion}</TableCell>
                            <TableCell className="max-w-xs truncate text-ink-500">
                              {r.inputFactors.length > 0 ? formatFactors(r.inputFactors) : '-'}
                            </TableCell>
                            <TableCell>{formatIncidentDateTime(r.assessedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="mt-4">
                  {loading && <Skeleton lines={5} />}
                  {!loading && notifications.length === 0 && (
                    <EmptyState title={t('admin.users.noNotifications')} description={t('admin.users.noNotificationsDesc')} />
                  )}
                  {!loading && notifications.length > 0 && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t('admin.users.incidentId')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.channel')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.status')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.contact')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.createdAt')}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {notifications.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell className="font-mono text-sm">{n.incidentId}</TableCell>
                            <TableCell>{n.channel}</TableCell>
                            <TableCell><NotificationStatusBadge status={n.status} /></TableCell>
                            <TableCell>{n.contactName ?? n.contactId ?? '-'}</TableCell>
                            <TableCell>{formatIncidentDateTime(n.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Unsafe Reports Tab */}
              {activeTab === 'unsafeReports' && (
                <div className="mt-4">
                  {loading && <Skeleton lines={5} />}
                  {!loading && unsafeReports.length === 0 && (
                    <EmptyState title={t('admin.users.noUnsafeReports')} description={t('admin.users.noUnsafeReportsDesc')} />
                  )}
                  {!loading && unsafeReports.length > 0 && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>{t('admin.users.category')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.severity')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.descriptionLabel')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.location')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.status')}</TableHeaderCell>
                          <TableHeaderCell>{t('admin.users.createdAt')}</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unsafeReports.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <span className="font-medium text-ink-900">{r.category}</span>
                            </TableCell>
                            <TableCell>{r.severity}</TableCell>
                            <TableCell className="max-w-xs truncate text-ink-500">{r.description}</TableCell>
                            <TableCell className="text-ink-500">
                              {r.location
                                ? (
                                  <>
                                    <span className="font-mono text-xs">
                                      {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}
                                    </span>
                                    {r.location.address ? <div className="text-xs">{r.location.address}</div> : null}
                                  </>
                                )
                                : t('admin.users.noLocation')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.isVerified ? 'success' : 'warning'}>
                                {r.isVerified ? t('admin.users.verified') : t('admin.users.unverified')}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatIncidentDateTime(r.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>

    <Modal
      open={editModal !== null}
      onClose={() => setEditModal({ user: null })}
      title={t('admin.users.editTitle')}
      description={t('admin.users.description')}
    >
      <Form onSubmit={(e: FormEvent) => void onEditSubmit(e)}>
        {formError && (
          <Alert variant="danger" title={t('admin.users.updateError')} onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        )}
        <Input label={t('admin.users.name')} name="user-name" requiredMark value={form.name} error={fieldErrors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label={t('admin.users.email')} name="user-email" type="email" requiredMark value={form.email} error={fieldErrors.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <Input label={t('admin.users.phone')} name="user-phone" type="tel" requiredMark value={form.phone} error={fieldErrors.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        <Input label={t('admin.users.language')} name="user-language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} />
        <Select
          label={t('admin.users.role')}
          name="user-role"
          requiredMark
          value={form.role}
          error={fieldErrors.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          placeholder={t('admin.users.role')}
          options={[
            { label: t('role.user'), value: 'USER' },
            { label: t('role.admin'), value: 'ADMIN' },
            { label: t('role.responder'), value: 'RESPONDER' },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving} disabled={saving}>
            {t('admin.users.save')}
          </Button>
          <Button variant="ghost" onClick={() => setEditModal({ user: null })}>
            {t('admin.users.cancel')}
          </Button>
        </div>
      </Form>
    </Modal>

    <Dialog
      open={deleteModal !== null}
      onClose={() => setDeleteModal({ user: null })}
      variant="danger"
      title={t('admin.users.deleteTitle', { name: deleteModal?.user?.name ?? '' })}
      confirmLabel={t('admin.users.deleteConfirm')}
      confirmLoading={deleting}
      onConfirm={() => void onConfirmDelete()}
    >
      {t('admin.users.deleteConfirmBody')}
    </Dialog>
    </>
  )
}