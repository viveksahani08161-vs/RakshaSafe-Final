import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, api, getStoredToken } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { useToast } from '../components/ui/toast-context'
import {
  INCIDENT_PRIORITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  REPORT_FORMATS,
  REPORT_TYPES,
  SINGLE_RECORD_REPORT_TYPES,
  USER_SCOPED_REPORT_TYPES,
  formatDateTime,
  type ReportDetail,
  type ReportMeta,
  type ScopedUser,
  type Snapshot,
  type UserRecordOption,
} from '../lib/reports'
import { Alert } from '../components/ui/Alert'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { UserCombobox } from '../components/ui/UserCombobox'

interface ListResponse {
  reports: ReportMeta[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

type FieldErrors = Record<string, string>
type LoadFailure = 'denied' | 'unreachable' | 'failed' | null

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function toFieldErrors(details: unknown): FieldErrors {
  const out: FieldErrors = {}
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

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/** Scalar display value. ISO date-times are shown in local time; nothing is invented. */
function renderScalar(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') {
    return ISO_DATETIME_RE.test(value) ? formatDateTime(value) : value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return String(value)
}

/** Recursive renderer: nested objects/arrays become labeled blocks, never a raw JSON blob. */
function ValueTree({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-ink-400">—</span>
  if (typeof value !== 'object') return <span className="break-words">{renderScalar(value)}</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink-400">—</span>
    if (value.every((v) => v === null || typeof v !== 'object')) {
      return <span className="break-words">{value.map((v) => renderScalar(v)).join(', ')}</span>
    }
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-ink-200/70 bg-cream-50/60 p-2.5">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-ink-400">#{i + 1}</p>
            <ValueTree value={item} />
          </div>
        ))}
      </div>
    )
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return <span className="text-ink-400">—</span>
  return (
    <dl className="space-y-1.5">
      {entries.map(([metric, v]) => {
        const complex = v !== null && typeof v === 'object'
        return (
          <div key={metric} className={complex ? 'text-sm' : 'flex items-baseline justify-between gap-3 text-sm'}>
            <dt className="min-w-0 text-ink-500">{humanizeKey(metric)}</dt>
            <dd
              className={
                complex
                  ? 'mt-1 border-l-2 border-ink-200/70 pl-3 text-ink-900'
                  : 'min-w-0 break-words text-right font-bold text-ink-900'
              }
            >
              <ValueTree value={v} />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Presentation-only label for stored snapshot keys (camelCase → words). Values are never altered. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatVariant(format: string): BadgeVariant {
  switch (format) {
    case 'PDF':
      return 'primary'
    case 'CSV':
      return 'secondary'
    default:
      return 'neutral'
  }
}

/** Generic snapshot viewer: readable sections, nested objects and arrays. */
function SnapshotView({ snapshot, emptyLabel }: { snapshot: Snapshot; emptyLabel: string }) {
  const sections = Object.entries(snapshot).filter(([k]) => k !== 'generatedAtUtc' && k !== 'filters')
  if (sections.length === 0) {
    return <p className="text-sm text-ink-400">{emptyLabel}</p>
  }
  return (
    <div className="space-y-5">
      {sections.map(([section, value]) => (
        <div key={section}>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">{humanizeKey(section)}</p>
          <ValueTree value={value} />
        </div>
      ))}
    </div>
  )
}

export function ReportsPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<LoadFailure>(null)
  const [reportType, setReportType] = useState('incident-record')
  const [format, setFormat] = useState('PDF')
  const [title, setTitle] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fMonth, setFMonth] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [viewTarget, setViewTarget] = useState<ReportDetail | null>(null)
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReportMeta | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // User-scoped report flow: selected user → that user's records → record.
  const [scopedUser, setScopedUser] = useState<ScopedUser | null>(null)
  const [records, setRecords] = useState<UserRecordOption[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [recordId, setRecordId] = useState('')
  const isUserScoped = USER_SCOPED_REPORT_TYPES.includes(reportType)
  const isSingleRecord = SINGLE_RECORD_REPORT_TYPES.includes(reportType)

  const typeLabel = useCallback(
    (value: string): string => {
      switch (value) {
        case 'incident-summary':
          return t('admin.reports.type.incident-summary')
        case 'resource-summary':
          return t('admin.reports.type.resource-summary')
        case 'safety-overview':
          return t('admin.reports.type.safety-overview')
        case 'user-incident-summary':
          return t('admin.reports.type.user-incident-summary')
        case 'incident-record':
          return t('admin.reports.type.incident-record')
        case 'unsafe-area-record':
          return t('admin.reports.type.unsafe-area-record')
        default:
          return value
      }
    },
    [t],
  )

  // Sequence guard: only the latest in-flight list request may write state.
  const loadSeq = useRef(0)

  const load = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true)
    setFailure(null)
    loadSeq.current += 1
    const seq = loadSeq.current
    try {
      const res = await api<ListResponse>(`/admin/reports?page=${targetPage}&limit=10`, signal ? { signal } : {})
      if (signal?.aborted || loadSeq.current !== seq) return
      setData(res)
      setPage(res.pagination.page)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (signal?.aborted || loadSeq.current !== seq) return
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setFailure('denied')
      } else if (err instanceof ApiError && err.status === 0) {
        setFailure('unreachable')
      } else {
        setFailure('failed')
      }
    } finally {
      if (!signal?.aborted && loadSeq.current === seq) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  function resetScopedSelection(): void {
    setScopedUser(null)
    setRecords([])
    setRecordsError(null)
    setRecordId('')
  }

  function handleReportTypeChange(value: string): void {
    setReportType(value)
    resetScopedSelection()
    setFieldErrors({})
    setFormError(null)
  }

  function pickScopedUser(user: ScopedUser): void {
    setScopedUser(user)
    setRecordId('')
    setFieldErrors({})
    void loadUserRecords(user.id, reportType)
  }

  async function loadUserRecords(userId: string, forType: string): Promise<void> {
    setRecordsLoading(true)
    setRecordsError(null)
    setRecords([])
    try {
      if (forType === 'unsafe-area-record') {
        const res = await api<{ reports: { id: string; category: string; severity: string; isVerified: boolean; createdAt: string }[] }>(
          `/admin/unsafe-reports?userId=${encodeURIComponent(userId)}&limit=50`,
        )
        setRecords(
          (res.reports ?? []).map((r) => ({
            id: String(r.id),
            title: `${r.category} — ${r.isVerified ? 'verified' : 'unverified'}`,
            detail: `${r.severity} · ${formatDateTime(r.createdAt)} · Ref ${String(r.id)}`,
          })),
        )
      } else {
        const res = await api<{ incidents: { id: string; category: string; type: string; priority: string; status: string; createdAt: string }[] }>(
          `/admin/incidents?userId=${encodeURIComponent(userId)}&limit=50`,
        )
        setRecords(
          (res.incidents ?? []).map((i) => ({
            id: String(i.id),
            title: `${i.category} — ${i.status}`,
            detail: `${i.type} · ${i.priority} · ${formatDateTime(i.createdAt)} · Ref ${String(i.id)}`,
          })),
        )
      }
    } catch (err) {
      setRecordsError(err instanceof ApiError ? err.message : t('admin.reports.error.unreachable'))
    } finally {
      setRecordsLoading(false)
    }
  }

  const [previewTarget, setPreviewTarget] = useState<ReportDetail | null>(null)
  const [previewing, setPreviewing] = useState(false)

  /** Shared completeness check so preview and generate accept identical input. */
  function collectScopedFilters(): Record<string, string> | null {
    const filters: Record<string, string> = {}
    if (isUserScoped) {
      // The backend re-validates ownership in its own queries; these
      // client checks only stop incomplete submissions early.
      if (!scopedUser) {
        setFieldErrors({ 'filters.userId': t('admin.reports.generate.userRequired') })
        return null
      }
      filters.userId = scopedUser.id
      if (reportType === 'incident-record') {
        if (!recordId) {
          setFieldErrors({ 'filters.incidentId': t('admin.reports.generate.recordRequired') })
          return null
        }
        filters.incidentId = recordId
      } else if (reportType === 'unsafe-area-record') {
        if (!recordId) {
          setFieldErrors({ 'filters.unsafeReportId': t('admin.reports.generate.recordRequired') })
          return null
        }
        filters.unsafeReportId = recordId
      } else {
        if (fStatus) filters.status = fStatus
        if (fType) filters.type = fType
        if (fPriority) filters.priority = fPriority
        if (fMonth.trim()) filters.month = fMonth.trim()
      }
    } else if (reportType === 'incident-summary') {
      if (fStatus) filters.status = fStatus
      if (fType) filters.type = fType
      if (fPriority) filters.priority = fPriority
      if (fMonth.trim()) filters.month = fMonth.trim()
    }
    return filters
  }

  async function onGenerate(e: FormEvent): Promise<void> {
    e.preventDefault()
    await runGenerate()
  }

  async function runGenerate(): Promise<void> {
    if (generating) return
    setGenerating(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const filters = collectScopedFilters()
      if (!filters) return
      const res = await api<{ report: ReportDetail }>('/admin/reports', {
        method: 'POST',
        body: {
          reportType,
          format,
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(Object.keys(filters).length > 0 ? { filters } : {}),
        },
      })
      notify({ title: t('admin.reports.toast.generated'), description: res.report.title, variant: 'success' })
      setTitle('')
      await load(1)
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(t('admin.reports.error.generateGeneric'))
      }
    } finally {
      setGenerating(false)
    }
  }

  async function onPreview(): Promise<void> {
    if (previewing || generating) return
    setPreviewing(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const filters = collectScopedFilters()
      if (!filters) return
      const res = await api<{
        reportType: string
        format: string
        title: string
        filters: Record<string, string>
        dataSnapshot: Snapshot
      }>('/admin/reports/preview', {
        method: 'POST',
        body: {
          reportType,
          format,
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(Object.keys(filters).length > 0 ? { filters } : {}),
        },
      })
      setPreviewTarget({
        id: '',
        serialNo: null,
        title: res.title,
        reportType: res.reportType,
        filters: res.filters,
        format: res.format,
        createdAt: new Date().toISOString(),
        dataSnapshot: res.dataSnapshot,
      })
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(t('admin.reports.error.generateGeneric'))
      }
    } finally {
      setPreviewing(false)
    }
  }

  async function openDetail(id: string): Promise<void> {
    if (viewLoadingId !== null) return
    setViewLoadingId(id)
    try {
      const res = await api<{ report: ReportDetail }>(`/admin/reports/${id}`)
      setViewTarget(res.report)
    } catch (err) {
      notify({
        title: t('admin.reports.preview.loadFailed'),
        description: err instanceof ApiError ? err.message : t('admin.reports.error.generateGeneric'),
        variant: 'danger',
      })
    } finally {
      setViewLoadingId(null)
    }
  }

  async function download(report: ReportMeta): Promise<void> {
    if (downloading !== null) return
    setDownloading(report.id)
    try {
      const token = getStoredToken()
      const res = await fetch(`${API_BASE}/admin/reports/${report.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) {
        throw new Error(`Export failed (${res.status}).`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      const ext = report.format.toLowerCase()
      a.download = `rakshasafe-${report.reportType}-${report.id.slice(0, 8)}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 5000)
      notify({ title: t('admin.reports.toast.downloaded'), description: report.title, variant: 'success' })
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'AbortError'
      notify({
        title: t('admin.reports.toast.downloadFailed'),
        description: timedOut
          ? t('admin.reports.error.exportTimeout')
          : err instanceof Error ? err.message : t('admin.reports.error.generateGeneric'),
        variant: 'danger',
      })
    } finally {
      setDownloading(null)
    }
  }

  async function onDeleteConfirm(): Promise<void> {
    if (!deleteTarget || deleting) return
    const target = deleteTarget
    setDeleting(true)
    setDeleteError(null)
    try {
      await api<{ deleted: boolean }>(`/admin/reports/${target.id}`, { method: 'DELETE' })
      notify({ title: t('admin.reports.toast.deleted'), description: target.title, variant: 'success' })
      setDeleteTarget(null)
      if (viewTarget?.id === target.id) setViewTarget(null)
      await load(page)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setDeleteError(t('admin.reports.deleteForbidden'))
      } else if (err instanceof ApiError && err.status === 404) {
        setDeleteError(t('admin.reports.deleteNotFound'))
      } else {
        setDeleteError(err instanceof ApiError ? err.message : t('admin.reports.toast.deleteFailed'))
      }
    } finally {
      setDeleting(false)
    }
  }

  const failed = failure !== null
  const latest = !loading && !failed && data && data.reports.length > 0 ? data.reports[0] : null
  const filterEntries = viewTarget ? Object.entries(viewTarget.filters ?? {}) : []

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card className="min-w-0">
        <CardHeader title={t('admin.reports.title')} description={t('admin.reports.description')} />
        <CardBody>
          {loading ? (
            <Skeleton lines={2} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  {t('admin.reports.summary.total')}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-ink-900">{failed || !data ? '—' : data.pagination.total}</dd>
              </div>
              <div className="min-w-0 rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  {t('admin.reports.summary.latest')}
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-ink-900">
                  {latest ? latest.title : t('admin.reports.summary.none')}
                </dd>
                {latest && (
                  <p className="mt-0.5 text-xs text-ink-500">
                    {typeLabel(latest.reportType)} · {formatDateTime(latest.createdAt)}
                  </p>
                )}
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      <Card id="report-generate" className="min-w-0">
        <CardHeader title={t('admin.reports.generate.title')} description={t('admin.reports.generate.description')} />
        <CardBody>
          <Form onSubmit={(e: FormEvent) => void onGenerate(e)}>
            {formError && (
              <Alert variant="danger" title={t('admin.reports.error.generate')} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label={t('admin.reports.generate.reportType')}
                name="report-type"
                value={reportType}
                error={fieldErrors.reportType}
                onChange={(e) => handleReportTypeChange(e.target.value)}
                options={REPORT_TYPES.map((rt) => ({ label: typeLabel(rt.value), value: rt.value }))}
              />
              <Select
                label={t('admin.reports.generate.format')}
                name="report-format"
                value={format}
                error={fieldErrors.format}
                onChange={(e) => setFormat(e.target.value)}
                options={REPORT_FORMATS.map((f) => ({ label: f.label, value: f.value }))}
              />
              <Input
                label={t('admin.reports.generate.titleField')}
                name="report-title"
                placeholder={t('admin.reports.generate.titlePlaceholder')}
                hint={t('admin.reports.generate.titleHint')}
                value={title}
                error={fieldErrors.title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {isUserScoped && (
              <div className="space-y-4 rounded-xl border border-ink-200/70 bg-cream-50/50 p-4">
                {!scopedUser ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-ink-700">{t('admin.reports.generate.userLabel')}</p>
                    <UserCombobox
                      onSelect={(u) =>
                        pickScopedUser({
                          id: u.id,
                          name: u.name,
                          email: u.email,
                          phone: u.phone ?? '',
                        })
                      }
                    />
                    {fieldErrors['filters.userId'] && (
                      <p className="text-xs font-medium text-rose-600">{fieldErrors['filters.userId']}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                          {t('admin.reports.generate.selectedUser')}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-bold text-ink-900" title={scopedUser.name}>
                          {scopedUser.name}
                        </p>
                        <p className="mt-0.5 break-words text-xs text-ink-500">
                          ID: {scopedUser.id}
                          <br />
                          {scopedUser.email}
                          {scopedUser.phone ? ` · ${scopedUser.phone}` : ''}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={resetScopedSelection}>
                        {t('admin.reports.generate.changeUser')}
                      </Button>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-ink-700">
                        {t('admin.reports.generate.userRecords')} ({records.length})
                      </p>
                      {recordsLoading && <Skeleton lines={3} />}
                      {!recordsLoading && recordsError && (
                        <Alert
                          variant="danger"
                          onClose={() => setRecordsError(null)}
                        >
                          {recordsError}{' '}
                          <button
                            type="button"
                            className="font-bold underline"
                            onClick={() => void loadUserRecords(scopedUser.id, reportType)}
                          >
                            {t('admin.reports.generate.userSearch')}
                          </button>
                        </Alert>
                      )}
                      {!recordsLoading && !recordsError && records.length === 0 && (
                        <p className="text-sm text-ink-500">{t('admin.reports.generate.noRecords')}</p>
                      )}
                      {!recordsLoading && !recordsError && records.length > 0 && (
                        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                          {records.map((r) => (
                            <li key={r.id}>
                              {isSingleRecord ? (
                                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-200/70 bg-white p-3 transition-colors hover:border-gold-400">
                                  <input
                                    type="radio"
                                    name="scoped-report-record"
                                    checked={recordId === r.id}
                                    onChange={() => setRecordId(r.id)}
                                    className="mt-1 size-4 shrink-0 accent-gold-600"
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-ink-900" title={r.title}>
                                      {r.title}
                                    </span>
                                    <span className="mt-0.5 block break-words text-xs text-ink-500">{r.detail}</span>
                                  </span>
                                </label>
                              ) : (
                                <div className="rounded-xl border border-ink-200/70 bg-white p-3">
                                  <p className="truncate text-sm font-bold text-ink-900" title={r.title}>
                                    {r.title}
                                  </p>
                                  <p className="mt-0.5 break-words text-xs text-ink-500">{r.detail}</p>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {(fieldErrors['filters.incidentId'] ?? fieldErrors['filters.unsafeReportId']) && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {fieldErrors['filters.incidentId'] ?? fieldErrors['filters.unsafeReportId']}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {['incident-summary', 'user-incident-summary'].includes(reportType) && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink-700">{t('admin.reports.generate.filters')}</p>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Select
                    label={t('admin.reports.generate.status')}
                    name="filter-status"
                    value={fStatus}
                    error={fieldErrors['filters.status']}
                    onChange={(e) => setFStatus(e.target.value)}
                    options={[{ label: t('admin.reports.generate.filterAll'), value: '' }, ...INCIDENT_STATUSES.map((s) => ({ label: s, value: s }))]}
                  />
                  <Select
                    label={t('admin.reports.generate.incidentType')}
                    name="filter-type"
                    value={fType}
                    error={fieldErrors['filters.type']}
                    onChange={(e) => setFType(e.target.value)}
                    options={[{ label: t('admin.reports.generate.filterAll'), value: '' }, ...INCIDENT_TYPES.map((type) => ({ label: type, value: type }))]}
                  />
                  <Select
                    label={t('admin.reports.generate.priority')}
                    name="filter-priority"
                    value={fPriority}
                    error={fieldErrors['filters.priority']}
                    onChange={(e) => setFPriority(e.target.value)}
                    options={[{ label: t('admin.reports.generate.filterAll'), value: '' }, ...INCIDENT_PRIORITIES.map((p) => ({ label: p, value: p }))]}
                  />
                  <Input
                    label={t('admin.reports.generate.month')}
                    name="filter-month"
                    type="month"
                    placeholder={t('admin.reports.generate.monthPlaceholder')}
                    value={fMonth}
                    error={fieldErrors['filters.month']}
                    onChange={(e) => setFMonth(e.target.value)}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-400">{t('admin.reports.generate.filtersHint')}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" loading={generating} disabled={generating} className="w-full sm:w-auto">
                {generating ? t('admin.reports.generate.generating') : t('admin.reports.generate.submit')}
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={previewing}
                disabled={previewing || generating}
                onClick={() => void onPreview()}
                className="w-full sm:w-auto"
              >
                {t('admin.reports.generate.preview')}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      <Card className="min-w-0">
        <CardHeader title={t('admin.reports.list.title')} description={t('admin.reports.list.description')} />
        <CardBody>
          {loading && <Skeleton lines={4} />}
          {!loading && failed && (
            <ErrorState
              title={t('admin.reports.error.load')}
              description={
                failure === 'denied' ? t('admin.reports.error.denied') : t('admin.reports.error.unreachable')
              }
              onRetry={() => void load(page)}
            />
          )}
          {!loading && !failed && data && data.reports.length === 0 && (
            <EmptyState
              title={t('admin.reports.empty.title')}
              description={t('admin.reports.empty.description')}
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => document.getElementById('report-generate')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {t('admin.reports.generate.title')}
                </Button>
              }
            />
          )}
          {!loading && !failed && data && data.reports.length > 0 && (
            <div className="space-y-4">
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell scope="col">{t('admin.reports.list.serial')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.reports.list.colTitle')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.reports.list.colType')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.reports.list.colFormat')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.reports.list.colCreated')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.reports.list.colActions')}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs font-semibold text-ink-500">
                          {r.serialNo ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-ink-900">{r.title}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{typeLabel(r.reportType)}</TableCell>
                        <TableCell>
                          <Badge variant={formatVariant(r.format)}>{r.format}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink-500">{formatDateTime(r.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" loading={viewLoadingId === r.id} disabled={viewLoadingId !== null} onClick={() => void openDetail(r.id)}>
                              {t('admin.reports.list.view')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={downloading === r.id}
                              disabled={downloading !== null}
                              onClick={() => void download(r)}
                            >
                              {downloading === r.id
                                ? t('admin.reports.list.downloading')
                                : t('admin.reports.list.download')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeleteError(null)
                                setDeleteTarget(r)
                              }}
                              aria-label={t('admin.reports.deleteAria', { title: r.title })}
                            >
                              {t('common.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid min-w-0 gap-3 md:hidden" role="list" aria-label={t('admin.reports.list.title')}>
                {data.reports.map((r) => (
                  <article
                    key={r.id}
                    role="listitem"
                    className="min-w-0 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate font-bold text-ink-900" title={r.title}>
                        {r.title}
                      </p>
                      <Badge variant={formatVariant(r.format)}>{r.format}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-400">
                      {t('admin.reports.list.serial')}: {r.serialNo ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {typeLabel(r.reportType)} · {formatDateTime(r.createdAt)}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        fullWidth
                        loading={viewLoadingId === r.id}
                        disabled={viewLoadingId !== null}
                        onClick={() => void openDetail(r.id)}
                      >
                        {t('admin.reports.list.view')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        fullWidth
                        loading={downloading === r.id}
                        disabled={downloading !== null}
                        onClick={() => void download(r)}
                      >
                        {downloading === r.id
                          ? t('admin.reports.list.downloading')
                          : t('admin.reports.list.download')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        fullWidth
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(r)
                        }}
                        aria-label={t('admin.reports.deleteAria', { title: r.title })}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <Pagination current={data.pagination.page} totalPages={data.pagination.totalPages} disabled={loading} onPageChange={(p) => void load(p)} />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title ?? t('admin.reports.title')}
        description={
          viewTarget
            ? [
                viewTarget.serialNo ?? null,
                typeLabel(viewTarget.reportType),
                viewTarget.format,
                formatDateTime(viewTarget.createdAt),
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        size="lg"
        footer={
          viewTarget ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setDeleteError(null)
                setDeleteTarget(viewTarget)
              }}
              aria-label={t('admin.reports.deleteAria', { title: viewTarget.title })}
            >
              {t('admin.reports.delete')}
            </Button>
          ) : undefined
        }
      >
        {viewTarget && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.reports.preview.filters')}
              </p>
              {filterEntries.length === 0 ? (
                <p className="text-sm text-ink-500">{t('admin.reports.preview.noFilters')}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {filterEntries.map(([key, value]) => (
                    <Badge key={key} variant="neutral">
                      {humanizeKey(key)}: {value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.reports.preview.generatedAt')}
              </p>
              <p className="text-sm text-ink-700">
                {typeof viewTarget.dataSnapshot.generatedAtUtc === 'string'
                  ? formatDateTime(viewTarget.dataSnapshot.generatedAtUtc as string)
                  : '—'}
              </p>
            </div>
            <SnapshotView snapshot={viewTarget.dataSnapshot} emptyLabel={t('admin.reports.preview.empty')} />
          </div>
        )}
      </Modal>

      <Modal
        open={previewTarget !== null}
        onClose={() => setPreviewTarget(null)}
        title={previewTarget?.title ?? t('admin.reports.generate.preview')}
        description={t('admin.reports.generate.previewNote')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              loading={generating}
              disabled={generating}
              onClick={() => {
                setPreviewTarget(null)
                void runGenerate()
              }}
            >
              {t('admin.reports.generate.submit')}
            </Button>
          </>
        }
      >
        {previewTarget && (
          <SnapshotView snapshot={previewTarget.dataSnapshot} emptyLabel={t('admin.reports.preview.empty')} />
        )}
      </Modal>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
        variant="danger"
        title={t('admin.reports.deleteTitle')}
        description={deleteTarget?.title}
        confirmLabel={t('admin.reports.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        confirmLoading={deleting}
        onConfirm={() => void onDeleteConfirm()}
      >
        {deleteError ? (
          <span className="text-rose-700 dark:text-rose-400">{deleteError}</span>
        ) : (
          <>
            {t('admin.reports.deleteWarning')}{' '}
            {deleteTarget && (
              <span className="font-semibold">
                {typeLabel(deleteTarget.reportType)} ({deleteTarget.format}) ·{' '}
                {formatDateTime(deleteTarget.createdAt)}
              </span>
            )}
          </>
        )}
      </Dialog>
    </div>
  )
}