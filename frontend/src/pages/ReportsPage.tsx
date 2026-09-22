import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api, getStoredToken } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { useToast } from '../components/ui/toast-context'
import {
  INCIDENT_PRIORITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  REPORT_FORMATS,
  REPORT_TYPES,
  formatDateTime,
  isRecord,
  type ReportDetail,
  type ReportMeta,
  type Snapshot,
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

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
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

/** Generic snapshot viewer: sections with key/value rows from the stored record. */
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
          {!isRecord(value) ? (
            <p className="text-sm text-ink-700">{renderValue(value)}</p>
          ) : (
            <dl className="space-y-1.5">
              {Object.entries(value).map(([metric, v]) => (
                <div key={metric} className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="min-w-0 truncate text-ink-500">{humanizeKey(metric)}</dt>
                  <dd className="shrink-0 font-bold text-ink-900">{renderValue(v)}</dd>
                </div>
              ))}
            </dl>
          )}
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
  const [reportType, setReportType] = useState('incident-summary')
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
  const [viewLoading, setViewLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReportMeta | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const typeLabel = useCallback(
    (value: string): string => {
      switch (value) {
        case 'incident-summary':
          return t('admin.reports.type.incident-summary')
        case 'resource-summary':
          return t('admin.reports.type.resource-summary')
        case 'safety-overview':
          return t('admin.reports.type.safety-overview')
        default:
          return value
      }
    },
    [t],
  )

  const load = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true)
    setFailure(null)
    try {
      const res = await api<ListResponse>(`/admin/reports?page=${targetPage}&limit=10`, signal ? { signal } : {})
      if (signal?.aborted) return
      setData(res)
      setPage(res.pagination.page)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (signal?.aborted) return
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setFailure('denied')
      } else if (err instanceof ApiError && err.status === 0) {
        setFailure('unreachable')
      } else {
        setFailure('failed')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
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

  async function onGenerate(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (generating) return
    setGenerating(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const filters: Record<string, string> = {}
      if (reportType === 'incident-summary') {
        if (fStatus) filters.status = fStatus
        if (fType) filters.type = fType
        if (fPriority) filters.priority = fPriority
        if (fMonth.trim()) filters.month = fMonth.trim()
      }
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

  async function openDetail(id: string): Promise<void> {
    setViewLoading(true)
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
      setViewLoading(false)
    }
  }

  async function download(report: ReportMeta): Promise<void> {
    setDownloading(report.id)
    try {
      const token = getStoredToken()
      const res = await fetch(`${API_BASE}/admin/reports/${report.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        throw new Error(`Export failed (${res.status}).`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = report.format.toLowerCase()
      a.download = `rakshasafe-${report.reportType}-${report.id.slice(0, 8)}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      notify({ title: t('admin.reports.toast.downloaded'), description: report.title, variant: 'success' })
    } catch (err) {
      notify({
        title: t('admin.reports.toast.downloadFailed'),
        description: err instanceof Error ? err.message : t('admin.reports.error.generateGeneric'),
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
      <Card>
        <CardHeader title={t('admin.reports.title')} description={t('admin.reports.description')} />
        <CardBody>
          {loading ? (
            <Skeleton lines={2} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  {t('admin.reports.summary.total')}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-ink-900">{failed || !data ? '—' : data.pagination.total}</dd>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
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

      <Card id="report-generate">
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
                onChange={(e) => setReportType(e.target.value)}
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
            {reportType === 'incident-summary' && (
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
                    placeholder={t('admin.reports.generate.monthPlaceholder')}
                    value={fMonth}
                    error={fieldErrors['filters.month']}
                    onChange={(e) => setFMonth(e.target.value)}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-400">{t('admin.reports.generate.filtersHint')}</p>
              </div>
            )}
            <Button type="submit" loading={generating} disabled={generating}>
              {generating ? t('admin.reports.generate.generating') : t('admin.reports.generate.submit')}
            </Button>
          </Form>
        </CardBody>
      </Card>

      <Card>
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
                            <Button size="sm" variant="outline" onClick={() => void openDetail(r.id)} disabled={viewLoading}>
                              {t('admin.reports.list.view')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={downloading === r.id}
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
              <div className="grid gap-3 md:hidden" role="list" aria-label={t('admin.reports.list.title')}>
                {data.reports.map((r) => (
                  <article
                    key={r.id}
                    role="listitem"
                    className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate font-bold text-ink-900" title={r.title}>
                        {r.title}
                      </p>
                      <Badge variant={formatVariant(r.format)}>{r.format}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {typeLabel(r.reportType)} · {formatDateTime(r.createdAt)}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        fullWidth
                        onClick={() => void openDetail(r.id)}
                        disabled={viewLoading}
                      >
                        {t('admin.reports.list.view')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        fullWidth
                        loading={downloading === r.id}
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
              <Pagination current={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(p) => void load(p)} />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title ?? t('admin.reports.title')}
        description={viewTarget ? `${typeLabel(viewTarget.reportType)} · ${viewTarget.format} · ${formatDateTime(viewTarget.createdAt)}` : undefined}
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