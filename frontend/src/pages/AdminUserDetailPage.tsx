import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { formatDateTime as formatIncidentDateTime, type Incident } from '../lib/incidents'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { useI18n } from '../lib/i18n'
import { hashUserId, navigateTo } from '../lib/hash-route'
import { ChevronLeftIcon } from '../components/ui/icons'

interface AdminUserDetail {
  id: string
  name: string
  email: string
  phone: string
  role: string
  language?: string
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

export function AdminUserDetailPage() {
  const { t } = useI18n()
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

  if (!userId) {
    return <div>Invalid user ID</div>
  }

  return (
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
                <h2 id="profile-heading" className="text-lg font-bold text-ink-900 mb-4">{t('admin.users.profile')}</h2>
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
  )
}