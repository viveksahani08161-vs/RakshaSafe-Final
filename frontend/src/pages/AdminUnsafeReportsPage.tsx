import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { formatDateTime, type UnsafeReport } from '../lib/unsafeReports'
import { useToast } from '../components/ui/toast-context'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterBar } from '../components/ui/FilterBar'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
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

function StatusBadge({ isVerified }: { isVerified: boolean }) {
  return (
    <Badge variant={isVerified ? 'success' : 'warning'} dot>
      {isVerified ? 'Verified' : 'Pending Review'}
    </Badge>
  )
}

export function AdminUnsafeReportsPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [viewTarget, setViewTarget] = useState<UnsafeReport | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      setFailed(false)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (statusFilter) params.set('isVerified', statusFilter)
        if (search.trim()) params.set('search', search.trim())
        const res = await api<ListResponse>(`/admin/unsafe-reports?${params.toString()}`, signal ? { signal } : {})
        setData(res)
        setPage(res.pagination.page)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFailed(true)
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

  async function setVerified(report: UnsafeReport, isVerified: boolean): Promise<void> {
    setVerifying(true)
    try {
      await api(`/admin/unsafe-reports/${report.id}`, { method: 'PATCH', body: { isVerified } })
      notify({
        title: isVerified ? t('admin.unsafeReports.reportVerified') : t('admin.unsafeReports.reportUnverified'),
        description: report.category,
        variant: isVerified ? 'success' : 'info',
      })
      setViewTarget(null)
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

  function resetFilters(): void {
    setStatusFilter('')
    setSearch('')
    setPage(1)
  }

  const filtersActive = statusFilter !== '' || search.trim() !== ''
  const shown = detail?.report ?? viewTarget

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card>
        <CardHeader
          title={t('admin.unsafeReports.title')}
          description={t('admin.unsafeReports.description')}
        />
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
              <ErrorState title={t('admin.unsafeReports.couldNotLoad')} description={t('admin.unsafeReports.serverUnreachable')} onRetry={() => void load(page)} />
            )}
            {!loading && !failed && data && data.reports.length === 0 && (
              <EmptyState
                title={t('admin.unsafeReports.noReportsFound')}
                description={filtersActive ? t('admin.unsafeReports.noMatchFilters') : t('admin.unsafeReports.noReportsSubmitted')}
              />
            )}
            {!loading && !failed && data && data.reports.length > 0 && (
              <div className="space-y-4">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t('admin.unsafeReports.category')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.unsafeReports.severity')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.unsafeReports.location')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.unsafeReports.state')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.unsafeReports.reported')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.unsafeReports.actions')}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <span className="font-medium text-ink-900">{r.category}</span>
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={r.severity} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink-500">
                          {r.location ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}` : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge isVerified={r.isVerified} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink-500">{formatDateTime(r.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => void openDetail(r)}>
                              {t('admin.unsafeReports.view')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={verifying}
                              onClick={() => void setVerified(r, !r.isVerified)}
                            >
                              {r.isVerified ? t('admin.unsafeReports.unverify') : t('admin.unsafeReports.verify')}
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
          </div>
        </CardBody>
      </Card>

      <Modal
        open={viewTarget !== null}
        onClose={() => {
          if (!verifying) {
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
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.severity')}</dt>
                <dd className="mt-0.5 text-ink-900">{shown.severity}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.state')}</dt>
                <dd className="mt-0.5">
                  <StatusBadge isVerified={shown.isVerified} />
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.descriptionLabel')}</dt>
                <dd className="mt-0.5 leading-relaxed text-ink-900">{shown.description}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.location')}</dt>
                <dd className="mt-0.5 text-ink-900">
                  {shown.location
                    ? `${shown.location.latitude.toFixed(6)}, ${shown.location.longitude.toFixed(6)}${shown.location.accuracy !== undefined ? ` (±${Math.round(shown.location.accuracy)} m)` : ''}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.reported')}</dt>
                <dd className="mt-0.5 text-ink-900">{formatDateTime(shown.createdAt)}</dd>
              </div>
              {detail?.reporter && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ink-500">{t('admin.unsafeReports.reporter')}</dt>
                  <dd className="mt-0.5 text-ink-900">
                    {detail.reporter.name} · {detail.reporter.email} · {detail.reporter.phone}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={shown.isVerified ? 'outline' : 'primary'}
                loading={verifying}
                disabled={verifying}
                onClick={() => void setVerified(shown, !shown.isVerified)}
              >
                {shown.isVerified ? t('admin.unsafeReports.markUnverified') : t('admin.unsafeReports.verifyReport')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}