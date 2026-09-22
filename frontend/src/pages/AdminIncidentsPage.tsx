import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDateTime, statusBadgeVariant, type Incident } from '../lib/incidents'
import { Alert } from '../components/ui/Alert'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterBar } from '../components/ui/FilterBar'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'

interface ListResponse {
  incidents: Incident[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface SummaryResponse {
  total: number
  active: number
  byStatus: Record<string, number>
}

const STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const TYPES = ['Safety', 'Disaster']

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

export function AdminIncidentsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      const summaryResponse = await api<SummaryResponse>('/admin/incidents/summary', signal ? { signal } : {})
      if (!signal?.aborted) setSummary(summaryResponse)
    } catch {
      /* summary is supplementary; the list shows its own error state */
    }
  }, [])

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      setFailed(false)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (status) params.set('status', status)
        if (priority) params.set('priority', priority)
        if (type) params.set('type', type)
        if (search.trim()) params.set('search', search.trim())
        const res = await api<ListResponse>(`/admin/incidents?${params.toString()}`, signal ? { signal } : {})
        setData(res)
        setPage(res.pagination.page)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFailed(true)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [status, priority, type, search],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadSummary(controller.signal)
    return () => controller.abort()
  }, [loadSummary])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  function resetFilters(): void {
    setStatus('')
    setPriority('')
    setType('')
    setSearch('')
    setPage(1)
  }

  const filtersActive = status !== '' || priority !== '' || type !== '' || search.trim() !== ''

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-ink-200/70 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-ink-900">{summary.total}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Total</p>
          </div>
          <div className="rounded-2xl border border-ink-200/70 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-gold-700 dark:text-gold-300">{summary.active}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Active</p>
          </div>
          <div className="rounded-2xl border border-ink-200/70 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-ink-900">{summary.byStatus.REPORTED ?? 0}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Reported</p>
          </div>
          <div className="rounded-2xl border border-ink-200/70 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{summary.byStatus.RESOLVED ?? 0}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Resolved</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader title="Incident management" description="Review SOS records, acknowledge them, and update their status." />
        <CardBody>
          <div className="space-y-4">
            <FilterBar
              search={
                <SearchInput
                  placeholder="Search category or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />
              }
              filters={
                <>
                  <Select
                    aria-label="Filter by status"
                    className="w-36"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={[{ label: 'All statuses', value: '' }, ...STATUSES.map((s) => ({ label: s, value: s }))]}
                  />
                  <Select
                    aria-label="Filter by priority"
                    className="w-32"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    options={[{ label: 'All priorities', value: '' }, ...PRIORITIES.map((p) => ({ label: p, value: p }))]}
                  />
                  <Select
                    aria-label="Filter by type"
                    className="w-32"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    options={[{ label: 'All types', value: '' }, ...TYPES.map((t) => ({ label: t, value: t }))]}
                  />
                </>
              }
              resultCount={data && !loading && !failed ? <span>{data.pagination.total} incident(s)</span> : undefined}
              onReset={filtersActive ? resetFilters : undefined}
            />
            {loading && (
              <div className="space-y-2" aria-label="Loading incidents">
                <Skeleton lines={5} />
              </div>
            )}
            {!loading && failed && (
              <ErrorState
                title="Could not load incidents"
                description="The server could not be reached. Check that the backend and database are running."
                onRetry={() => void load(page)}
              />
            )}
            {!loading && !failed && data && data.incidents.length === 0 && (
              <EmptyState
                title="No incidents found"
                description={filtersActive ? 'No incidents match the current filters.' : 'No SOS incidents have been reported yet.'}
              />
            )}
          {!loading && !failed && data && data.incidents.length > 0 && (
            <div className="space-y-4">
              <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Priority</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Reported</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <span className="font-medium text-ink-900">{incident.category}</span>
                        </TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>
                          <Badge variant={priorityBadgeVariant(incident.priority)}>{incident.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(incident.status)} dot>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink-500">{formatDateTime(incident.createdAt)}</TableCell>
                        <TableCell>
                          <a href={`#/admin/incidents/${incident.id}`}>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <Pagination current={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(p) => void load(p)} />
              </div>
            )}
            {!loading && !failed && data && data.incidents.length > 0 && (
              <Alert variant="info" title="Software records only">
                Assignment and status here coordinate records in the app. They do not guarantee physical response.
              </Alert>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
