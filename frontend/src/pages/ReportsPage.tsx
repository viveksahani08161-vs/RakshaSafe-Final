import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api, getStoredToken } from '../lib/api'
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
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
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

/** Generic snapshot viewer: sections with key/value rows, bars for count maps. */
function SnapshotView({ snapshot }: { snapshot: Snapshot }) {
  const sections = Object.entries(snapshot).filter(([k]) => k !== 'generatedAtUtc' && k !== 'filters')
  if (sections.length === 0) {
    return <p className="text-sm text-ink-400">Empty report — no data matched.</p>
  }
  return (
    <div className="space-y-5">
      {sections.map(([section, value]) => (
        <div key={section}>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">{section}</p>
          {!isRecord(value) ? (
            <p className="text-sm text-ink-700">{renderValue(value)}</p>
          ) : (
            <dl className="space-y-1.5">
              {Object.entries(value).map(([metric, v]) => (
                <div key={metric} className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="min-w-0 truncate text-ink-500">{metric}</dt>
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
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
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

  const load = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await api<ListResponse>(`/admin/reports?page=${targetPage}&limit=10`, signal ? { signal } : {})
      setData(res)
      setPage(res.pagination.page)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setFailed(true)
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
      notify({ title: 'Report generated', description: res.report.title, variant: 'success' })
      setTitle('')
      setFStatus('')
      setFType('')
      setFPriority('')
      setFMonth('')
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
        setFormError('Could not generate the report. Please try again.')
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
        title: 'Could not load report',
        description: err instanceof ApiError ? err.message : 'Please try again.',
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
      notify({ title: 'Export downloaded', description: report.title, variant: 'success' })
    } catch (err) {
      notify({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card>
        <CardHeader title="Generate report" description="Aggregated from live records. Stored with its data snapshot (UTC)." />
        <CardBody>
          <Form onSubmit={(e: FormEvent) => void onGenerate(e)}>
            {formError && (
              <Alert variant="danger" title="Generation failed" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Report type"
                value={reportType}
                error={fieldErrors.reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={REPORT_TYPES.map((t) => ({ label: t.label, value: t.value }))}
              />
              <Select
                label="Format"
                value={format}
                error={fieldErrors.format}
                onChange={(e) => setFormat(e.target.value)}
                options={REPORT_FORMATS.map((f) => ({ label: f.label, value: f.value }))}
              />
              <Input
                label="Title (optional)"
                placeholder="Auto-generated if blank"
                value={title}
                error={fieldErrors.title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {reportType === 'incident-summary' && (
              <div className="grid gap-4 sm:grid-cols-4">
                <Select
                  label="Status filter"
                  value={fStatus}
                  error={fieldErrors['filters.status']}
                  onChange={(e) => setFStatus(e.target.value)}
                  options={[{ label: 'All', value: '' }, ...INCIDENT_STATUSES.map((s) => ({ label: s, value: s }))]}
                />
                <Select
                  label="Type filter"
                  value={fType}
                  error={fieldErrors['filters.type']}
                  onChange={(e) => setFType(e.target.value)}
                  options={[{ label: 'All', value: '' }, ...INCIDENT_TYPES.map((t) => ({ label: t, value: t }))]}
                />
                <Select
                  label="Priority filter"
                  value={fPriority}
                  error={fieldErrors['filters.priority']}
                  onChange={(e) => setFPriority(e.target.value)}
                  options={[{ label: 'All', value: '' }, ...INCIDENT_PRIORITIES.map((p) => ({ label: p, value: p }))]}
                />
                <Input
                  label="Month (YYYY-MM, UTC)"
                  placeholder="2026-09"
                  value={fMonth}
                  error={fieldErrors['filters.month']}
                  onChange={(e) => setFMonth(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" loading={generating} disabled={generating}>
              Generate &amp; store report
            </Button>
          </Form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Generated reports" description="Downloads render from the stored snapshot, so files always match the display." />
        <CardBody>
          {loading && <Skeleton lines={4} />}
          {!loading && failed && (
            <ErrorState title="Could not load reports" description="The server could not be reached." onRetry={() => void load(page)} />
          )}
          {!loading && !failed && data && data.reports.length === 0 && (
            <EmptyState title="No reports yet" description="Generate the first report above." />
          )}
          {!loading && !failed && data && data.reports.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Title</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Format</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="font-medium text-ink-900">{r.title}</span>
                      </TableCell>
                      <TableCell>{r.reportType}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.format}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-ink-500">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => void openDetail(r.id)} disabled={viewLoading}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" loading={downloading === r.id} onClick={() => void download(r)}>
                            Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination current={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(p) => void load(p)} />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title ?? 'Report'}
        description={viewTarget ? `${viewTarget.reportType} · ${viewTarget.format} · ${formatDateTime(viewTarget.createdAt)}` : undefined}
        size="lg"
      >
        {viewTarget && <SnapshotView snapshot={viewTarget.dataSnapshot} />}
      </Modal>
    </div>
  )
}
