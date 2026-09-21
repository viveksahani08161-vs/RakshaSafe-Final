import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import {
  formatDateTime,
  UNSAFE_REPORT_CATEGORIES,
  UNSAFE_REPORT_SEVERITIES,
  type UnsafeReport,
} from '../lib/unsafeReports'
import type { IncidentLocation } from '../lib/incidents'
import {
  describeOutcome,
  requestDeviceLocation,
  reverseGeocode,
  type LocationOutcome,
} from '../lib/geolocation'
import { useToast } from '../components/ui/toast-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Checkbox } from '../components/ui/Checkbox'
import { FilterBar } from '../components/ui/FilterBar'
import { Form } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { Textarea } from '../components/ui/Textarea'
import { useI18n } from '../lib/i18n'

interface ListResponse {
  reports: UnsafeReport[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface Reporter {
  id: string
  name: string
  email: string
  phone: string
  role: string
}

interface DetailResponse {
  report: UnsafeReport
  reporter: Reporter | null
}

interface SummaryCounts {
  total: number | null
  pending: number | null
  verified: number | null
}

type LoadFailure = 'denied' | 'unreachable' | null

function SeverityBadge({ severity }: { severity: string }) {
  const key = severity.trim().toLowerCase()
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    low: 'secondary',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  const variant = variants[key] ?? 'outline'
  return <Badge variant={variant}>{severity}</Badge>
}

function StatusBadge({ isVerified, t }: { isVerified: boolean; t: (key: 'admin.unsafeReports.verified' | 'admin.unsafeReports.pendingReview') => string }) {
  return (
    <Badge variant={isVerified ? 'success' : 'warning'} dot>
      {isVerified ? t('admin.unsafeReports.verified') : t('admin.unsafeReports.pendingReview')}
    </Badge>
  )
}

/** Stored location line for the table: address/area first, coordinates as fallback. Never invented. */
function LocationCell({ location, noLocation }: { location: IncidentLocation | null; noLocation: string }) {
  if (!location) return <span className="text-ink-400">{noLocation}</span>
  const area = [location.city, location.state, location.country].filter(Boolean).join(', ')
  const primary = location.address ?? (area !== '' ? area : null)
  if (primary) {
    return (
      <div className="space-y-0.5">
        <span className="block max-w-56 truncate text-ink-700" title={primary}>
          {primary}
        </span>
        <span className="block text-xs text-ink-400">
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </span>
      </div>
    )
  }
  return (
    <span className="whitespace-nowrap text-ink-500">
      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
    </span>
  )
}

function formatArea(location: IncidentLocation): string | null {
  const area = [location.city, location.state, location.country].filter(Boolean).join(', ')
  return area !== '' ? area : null
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

export function AdminUnsafeReportsPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [counts, setCounts] = useState<SummaryCounts>({ total: null, pending: null, verified: null })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<LoadFailure>(null)
  const [viewTarget, setViewTarget] = useState<UnsafeReport | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<{ report: UnsafeReport; isVerified: boolean } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [editing, setEditing] = useState<UnsafeReport | null>(null)
  const [deleting, setDeleting] = useState<UnsafeReport | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editSeverity, setEditSeverity] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsVerified, setEditIsVerified] = useState(false)
  const [editOutcome, setEditOutcome] = useState<LocationOutcome | null>(null)
  const [editAreaName, setEditAreaName] = useState<string | null>(null)
  const [editAcquiring, setEditAcquiring] = useState(false)
  const [editGeocoding, setEditGeocoding] = useState(false)
  const [editLocationReplaced, setEditLocationReplaced] = useState(false)
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      setFailure(null)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (statusFilter) params.set('isVerified', statusFilter)
        if (search.trim()) params.set('search', search.trim())
        const opts = signal ? { signal } : {}
        const [res, totalRes, pendingRes, verifiedRes] = await Promise.all([
          api<ListResponse>(`/admin/unsafe-reports?${params.toString()}`, opts),
          api<ListResponse>('/admin/unsafe-reports?page=1&limit=1', opts),
          api<ListResponse>('/admin/unsafe-reports?page=1&limit=1&isVerified=false', opts),
          api<ListResponse>('/admin/unsafe-reports?page=1&limit=1&isVerified=true', opts),
        ])
        if (signal?.aborted) return
        setData(res)
        setPage(res.pagination.page)
        setCounts({
          total: totalRes.pagination.total,
          pending: pendingRes.pagination.total,
          verified: verifiedRes.pagination.total,
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (signal?.aborted) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setFailure('denied')
        } else {
          setFailure('unreachable')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [statusFilter, search],
  )

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  async function openDetail(report: UnsafeReport): Promise<void> {
    setViewTarget(report)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await api<DetailResponse>(`/admin/unsafe-reports/${report.id}`)
      setDetail(res)
    } catch (err) {
      notify({
        title: t('admin.unsafeReports.couldNotLoadDetails'),
        description: err instanceof ApiError ? err.message : t('common.tryAgain'),
        variant: 'danger',
      })
      setViewTarget(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function onConfirmVerify(): Promise<void> {
    if (!confirmTarget || verifying) return
    const { report, isVerified } = confirmTarget
    setVerifying(true)
    try {
      await api(`/admin/unsafe-reports/${report.id}`, { method: 'PATCH', body: { isVerified } })
      notify({
        title: isVerified ? t('admin.unsafeReports.reportVerified') : t('admin.unsafeReports.reportUnverified'),
        description: report.category,
        variant: isVerified ? 'success' : 'info',
      })
      setConfirmTarget(null)
      setViewTarget(null)
      setDetail(null)
      await load(page)
    } catch (err) {
      notify({
        title: t('admin.unsafeReports.reviewActionFailed'),
        description: err instanceof ApiError ? err.message : t('common.tryAgain'),
        variant: 'danger',
      })
    } finally {
      setVerifying(false)
    }
  }

  function openEdit(report: UnsafeReport): void {
    setEditing(report)
    setEditCategory(report.category)
    setEditSeverity(report.severity.trim().toLowerCase())
    setEditDescription(report.description)
    setEditIsVerified(report.isVerified)
    setEditOutcome(null)
    setEditAreaName(null)
    setEditLocationReplaced(false)
    setEditFieldErrors({})
    setEditFormError(null)
  }

  async function acquireEditLocation(): Promise<void> {
    setEditAcquiring(true)
    setEditAreaName(null)
    try {
      const result = await requestDeviceLocation()
      setEditOutcome(result)
      setEditAcquiring(false)
      if (result.state === 'available') {
        setEditGeocoding(true)
        setEditAreaName(await reverseGeocode(result.coords.latitude, result.coords.longitude))
        setEditLocationReplaced(true)
      }
    } finally {
      setEditAcquiring(false)
      setEditGeocoding(false)
    }
  }

  function resetEditLocation(): void {
    setEditOutcome(null)
    setEditAreaName(null)
    setEditLocationReplaced(false)
  }

  async function onEditSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!editing) return
    const reportId = editing.id
    const errors: Record<string, string> = {}
    if (!editCategory) errors.category = t('unsafeReports.validation.categoryRequired')
    if (!editSeverity) errors.severity = t('unsafeReports.validation.severityRequired')
    if (!editDescription.trim()) errors.description = t('unsafeReports.validation.descriptionRequired')

    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors)
      return
    }

    setEditSaving(true)
    setEditFieldErrors({})
    setEditFormError(null)
    try {
      const replacementCoords =
        editLocationReplaced && editOutcome?.state === 'available' ? editOutcome.coords : null
      await api<{ report: UnsafeReport }>(`/admin/unsafe-reports/${reportId}`, {
        method: 'PATCH',
        body: {
          category: editCategory,
          severity: editSeverity,
          description: editDescription.trim(),
          isVerified: editIsVerified,
          ...(replacementCoords ? { location: replacementCoords } : {}),
        },
      })
      notify({ title: t('unsafeReports.updateSuccess'), variant: 'success' })
      setEditing(null)
      if (viewTarget?.id === reportId) {
        setViewTarget(null)
        setDetail(null)
      }
      await load(page)
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setEditFieldErrors(fields)
        } else {
          setEditFormError(err.message)
        }
      } else {
        setEditFormError(t('unsafeReports.updateError'))
      }
    } finally {
      setEditSaving(false)
    }
  }

  async function onDeleteConfirm(): Promise<void> {
    if (!deleting) return
    const reportId = deleting.id
    setDeleteSaving(true)
    try {
      await api(`/admin/unsafe-reports/${reportId}`, { method: 'DELETE' })
      notify({ title: t('unsafeReports.deleteSuccess'), variant: 'success' })
      setDeleting(null)
      if (viewTarget?.id === reportId) {
        setViewTarget(null)
        setDetail(null)
      }
      await load(page)
    } catch (err) {
      notify({
        title: t('unsafeReports.deleteError'),
        description: err instanceof ApiError ? err.message : t('common.tryAgain'),
        variant: 'danger',
      })
    } finally {
      setDeleteSaving(false)
    }
  }

  function resetFilters(): void {
    setStatusFilter('')
    setSearch('')
    setPage(1)
  }

  const filtersActive = statusFilter !== '' || search.trim() !== ''
  const failed = failure !== null
  const categoryOptions = UNSAFE_REPORT_CATEGORIES.map((category) => ({
    label: t(category.labelKey),
    value: category.value,
  }))
  const severityOptions = UNSAFE_REPORT_SEVERITIES.map((severity) => ({
    label: t(severity.labelKey),
    value: severity.value,
  }))
  const editCategoryOptions = categoryOptions.some((option) => option.value === editCategory)
    ? categoryOptions
    : [...categoryOptions, { label: editCategory, value: editCategory }]
  const editSeverityOptions = severityOptions.some((option) => option.value === editSeverity)
    ? severityOptions
    : [...severityOptions, { label: editSeverity, value: editSeverity }]
  const shown = detail?.report ?? viewTarget
  const shownLocation = shown?.location ?? null
  const shownArea = shownLocation ? formatArea(shownLocation) : null

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card className="min-w-0">
        <CardHeader
          title={t('admin.unsafeAreas.title')}
          description={t('admin.unsafeAreas.description')}
        />
        <CardBody>
          {loading ? (
            <Skeleton lines={2} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  {t('admin.unsafeAreas.total')}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-ink-900">{counts.total ?? '—'}</dd>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  {t('admin.unsafeAreas.pending')}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-amber-600">{counts.pending ?? '—'}</dd>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  {t('admin.unsafeAreas.verified')}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-emerald-600">{counts.verified ?? '—'}</dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      <Card className="min-w-0">
        <CardBody>
          <div className="space-y-4">
            <FilterBar
              search={
                <SearchInput
                  placeholder={t('admin.unsafeReports.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />
              }
              filters={
                <Select
                  aria-label={t('admin.unsafeReports.filterByState')}
                  className="w-40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { label: t('admin.unsafeReports.allStates'), value: '' },
                    { label: t('admin.unsafeReports.pendingReview'), value: 'false' },
                    { label: t('admin.unsafeReports.verified'), value: 'true' },
                  ]}
                />
              }
              resultCount={data && !loading && !failed ? <span>{data.pagination.total} {t('admin.unsafeReports.reportsCount')}</span> : undefined}
              onReset={filtersActive ? resetFilters : undefined}
            />
            {loading && <Skeleton lines={5} />}
            {!loading && failed && (
              <ErrorState
                title={failure === 'denied' ? t('admin.unsafeAreas.accessDenied') : t('admin.unsafeReports.couldNotLoad')}
                description={failure === 'denied' ? t('admin.unsafeAreas.accessDeniedDesc') : t('admin.unsafeReports.serverUnreachable')}
                onRetry={() => void load(page)}
              />
            )}
            {!loading && !failed && data && data.reports.length === 0 && (
              <EmptyState
                title={t('admin.unsafeReports.noReportsFound')}
                description={filtersActive ? t('admin.unsafeReports.noMatchFilters') : t('admin.unsafeReports.noReportsSubmitted')}
              />
            )}
            {!loading && !failed && data && data.reports.length > 0 && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell scope="col">{t('unsafeReports.reportId')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('admin.unsafeAreas.report')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('admin.unsafeReports.severity')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('admin.unsafeReports.location')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('admin.unsafeReports.state')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('admin.unsafeReports.reported')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('admin.unsafeReports.actions')}</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.reports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <span className="block max-w-32 truncate font-mono text-xs text-ink-700" title={r.id}>
                              {r.id}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-ink-900">{r.category}</span>
                            <span className="block max-w-64 truncate text-xs text-ink-400" title={r.description}>
                              {r.description}
                            </span>
                          </TableCell>
                          <TableCell>
                            <SeverityBadge severity={r.severity} />
                          </TableCell>
                          <TableCell>
                            <LocationCell location={r.location} noLocation={t('admin.unsafeAreas.noLocation')} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge isVerified={r.isVerified} t={t} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-ink-500">{formatDateTime(r.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => void openDetail(r)}>
                                {t('admin.unsafeReports.view')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                                {t('unsafeReports.edit')}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleting(r)}>
                                {t('unsafeReports.delete')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={verifying}
                                onClick={() => setConfirmTarget({ report: r, isVerified: !r.isVerified })}
                              >
                                {r.isVerified ? t('admin.unsafeReports.unverify') : t('admin.unsafeReports.verify')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Pagination current={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(p) => void load(p)} />
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Modal
        open={viewTarget !== null}
        onClose={() => {
          if (!verifying && !confirmTarget) {
            setViewTarget(null)
            setDetail(null)
          }
        }}
        title={shown?.category ?? t('admin.unsafeReports.reportDetails')}
        description={shown ? `${t('common.reference')} ${shown.id}` : undefined}
        size="lg"
      >
        {detailLoading && <Skeleton lines={5} />}
        {!detailLoading && shown && (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink-500">{t('unsafeReports.reportId')}</dt>
                <dd className="mt-0.5 break-all font-mono text-ink-900">{shown.id}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.severity')}</dt>
                <dd className="mt-0.5">
                  <SeverityBadge severity={shown.severity} />
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.state')}</dt>
                <dd className="mt-0.5">
                  <StatusBadge isVerified={shown.isVerified} t={t} />
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.descriptionLabel')}</dt>
                <dd className="mt-0.5 leading-relaxed text-ink-900">{shown.description}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.unsafeAreas.recordedLocation')}
              </p>
              {!shownLocation ? (
                <p className="text-sm text-ink-500">{t('admin.unsafeAreas.noLocation')}</p>
              ) : (
                <dl className="grid gap-3 rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.unsafeAreas.coordinates')}</dt>
                    <dd className="mt-0.5 text-ink-900">
                      {shownLocation.latitude.toFixed(6)}, {shownLocation.longitude.toFixed(6)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.unsafeAreas.accuracy')}</dt>
                    <dd className="mt-0.5 text-ink-900">
                      {shownLocation.accuracy !== undefined ? `±${Math.round(shownLocation.accuracy)} m` : '—'}
                    </dd>
                  </div>
                  {shownLocation.address && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-ink-500">{t('admin.unsafeAreas.address')}</dt>
                      <dd className="mt-0.5 text-ink-900">{shownLocation.address}</dd>
                    </div>
                  )}
                  {shownArea && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-ink-500">{t('admin.unsafeAreas.area')}</dt>
                      <dd className="mt-0.5 text-ink-900">{shownArea}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {detail?.reporter && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.reporter')}</dt>
                  <dd className="mt-0.5 text-ink-900">
                    {detail.reporter.name} · {detail.reporter.email} · {detail.reporter.phone}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.reported')}</dt>
                <dd className="mt-0.5 text-ink-900">{formatDateTime(shown.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeAreas.updated')}</dt>
                <dd className="mt-0.5 text-ink-900">{formatDateTime(shown.updatedAt)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={shown.isVerified ? 'outline' : 'primary'}
                disabled={verifying}
                onClick={() => setConfirmTarget({ report: shown, isVerified: !shown.isVerified })}
              >
                {shown.isVerified ? t('admin.unsafeReports.markUnverified') : t('admin.unsafeReports.verifyReport')}
              </Button>
              <Button variant="outline" onClick={() => openEdit(shown)}>
                {t('unsafeReports.edit')}
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(shown)}>
                {t('unsafeReports.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Dialog
        open={confirmTarget !== null}
        onClose={() => {
          if (!verifying) setConfirmTarget(null)
        }}
        variant="default"
        title={
          confirmTarget
            ? confirmTarget.isVerified
              ? t('admin.unsafeAreas.confirmVerifyTitle')
              : t('admin.unsafeAreas.confirmUnverifyTitle')
            : ''
        }
        confirmLabel={t('admin.unsafeAreas.confirm')}
        cancelLabel={t('admin.unsafeAreas.cancel')}
        confirmLoading={verifying}
        onConfirm={() => void onConfirmVerify()}
      >
        {confirmTarget
          ? confirmTarget.isVerified
            ? t('admin.unsafeAreas.confirmVerifyBody')
            : t('admin.unsafeAreas.confirmUnverifyBody')
          : ''}
      </Dialog>

      <Modal
        open={editing !== null}
        onClose={() => {
          if (!editSaving) setEditing(null)
        }}
        title={t('unsafeReports.editTitle')}
        description={t('unsafeReports.editDescription')}
      >
        <Form onSubmit={(event: FormEvent) => void onEditSubmit(event)}>
          {editFormError && (
            <Alert variant="danger" title={t('unsafeReports.updateError')} onClose={() => setEditFormError(null)}>
              {editFormError}
            </Alert>
          )}
          <Select
            label={t('unsafeReports.form.category')}
            placeholder={t('unsafeReports.form.categoryPlaceholder')}
            requiredMark
            value={editCategory}
            onChange={(event) => setEditCategory(event.target.value)}
            options={editCategoryOptions}
            error={editFieldErrors.category}
          />
          <Select
            label={t('unsafeReports.form.severity')}
            placeholder={t('unsafeReports.form.severityPlaceholder')}
            requiredMark
            value={editSeverity}
            onChange={(event) => setEditSeverity(event.target.value)}
            options={editSeverityOptions}
            error={editFieldErrors.severity}
          />
          <Textarea
            label={t('unsafeReports.form.description')}
            rows={4}
            placeholder={t('unsafeReports.form.descriptionPlaceholder')}
            requiredMark
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            error={editFieldErrors.description}
          />
          <Checkbox
            label={t('admin.unsafeReports.verified')}
            checked={editIsVerified}
            onChange={(event) => setEditIsVerified(event.target.checked)}
          />
          <div className="space-y-3 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
            <p className="text-sm font-bold text-ink-900">{t('unsafeReports.locationLabel')}</p>
            {editing?.location && !editLocationReplaced && (
              <p className="text-sm text-ink-700">
                {editing.location.latitude.toFixed(4)}, {editing.location.longitude.toFixed(4)}
                {editing.location.accuracy !== undefined ? ` (±${Math.round(editing.location.accuracy)} m)` : ''}
              </p>
            )}
            {!editOutcome && !editAcquiring && (
              <Button variant="outline" onClick={() => void acquireEditLocation()}>
                {editing?.location ? t('unsafeReports.location.retry') : t('unsafeReports.location.capture')}
              </Button>
            )}
            {editAcquiring && (
              <span className="flex items-center gap-2 text-sm text-ink-500">
                <Spinner size="sm" /> {t('unsafeReports.location.acquiring')}
              </span>
            )}
            {editOutcome && !editAcquiring && (
              <Alert
                variant={editOutcome.state === 'available' ? 'success' : 'warning'}
                title={describeOutcome(editOutcome)}
              >
                {editOutcome.state === 'available' && (
                  <span>
                    {editOutcome.coords.latitude.toFixed(6)}, {editOutcome.coords.longitude.toFixed(6)}
                    {editOutcome.coords.accuracy !== undefined && ` (±${Math.round(editOutcome.coords.accuracy)} m)`}
                    {editGeocoding && (
                      <span className="mt-1 flex items-center gap-2">
                        <Spinner size="sm" /> {t('unsafeReports.location.acquiring')}
                      </span>
                    )}
                    {editAreaName && <span className="mt-1 block">{t('unsafeReports.location.area', { area: editAreaName })}</span>}
                  </span>
                )}
              </Alert>
            )}
            {editOutcome?.state === 'available' && (
              <Button variant="ghost" size="sm" onClick={resetEditLocation}>
                {t('unsafeReports.locationKeepExisting')}
              </Button>
            )}
            {editOutcome && editOutcome.state !== 'available' && (
              <Button variant="outline" onClick={() => void acquireEditLocation()}>
                {t('unsafeReports.location.retry')}
              </Button>
            )}
            <p className="text-xs text-ink-400">{t('unsafeReports.editDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={editSaving} disabled={editSaving || editAcquiring}>
              {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={editSaving}>
              {t('common.cancel')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteSaving) setDeleting(null)
        }}
        variant="danger"
        title={t('unsafeReports.deleteTitle')}
        confirmLabel={t('unsafeReports.confirmDelete')}
        cancelLabel={t('common.cancel')}
        confirmLoading={deleteSaving}
        onConfirm={() => void onDeleteConfirm()}
      >
        {t('unsafeReports.deleteDescription')}{' '}
        {deleting && (
          <span>
            {deleting.category} · {formatDateTime(deleting.createdAt)}
          </span>
        )}
      </Dialog>
    </div>
  )
}
