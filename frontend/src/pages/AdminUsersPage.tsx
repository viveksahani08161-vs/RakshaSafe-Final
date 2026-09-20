import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { AuthUser } from '../lib/auth-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { useI18n } from '../lib/i18n'

interface UsersResponse {
  users: AuthUser[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

function formatDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

export function AdminUsersPage() {
  const { t } = useI18n()
  const [data, setData] = useState<UsersResponse | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (targetPage: number, signal?: AbortSignal, searchText = '') => {
    setLoading(true)
    setFailed(false)
    setDenied(false)
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
      if (searchText.trim() !== '') params.set('search', searchText.trim())
      const res = await api<UsersResponse>(
        `/admin/users?${params.toString()}`,
        signal ? { signal } : {},
      )
      setData(res)
      setPage(res.pagination.page)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setDenied(true)
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        /* request superseded — ignore */
      } else {
        setFailed(true)
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  function applySearch(): void {
    setAppliedSearch(search.trim())
    setPage(1)
    void load(1, undefined, search)
  }

  function resetSearch(): void {
    setSearch('')
    setAppliedSearch('')
    setPage(1)
    void load(1, undefined, '')
  }

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  function handleViewUser(userId: string): void {
    window.location.href = `#/admin/users/${userId}`
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Card>
        <CardHeader
          title={t('admin.users.title')}
          description={t('admin.users.description')}
        />
        <CardBody>
          {!loading && !denied && !failed && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="min-w-0 flex-1">
                <SearchInput
                  placeholder={t('admin.users.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applySearch()
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={applySearch}>
                  {t('common.search')}
                </Button>
                {(appliedSearch !== '' || search !== '') && (
                  <Button size="sm" variant="outline" onClick={resetSearch}>
                    {t('admin.users.reset')}
                  </Button>
                )}
              </div>
            </div>
          )}
          {loading && (
            <div className="space-y-2" aria-label={t('common.loading')}>
              <Skeleton lines={5} />
            </div>
          )}
          {!loading && denied && (
            <Alert variant="danger" title={t('admin.users.accessDenied')}>
              {t('admin.users.accessDeniedDesc')}
            </Alert>
          )}
          {!loading && failed && (
            <ErrorState
              title={t('admin.users.loadError')}
              description={t('admin.users.serverUnreachable')}
              onRetry={() => void load(page)}
            />
          )}
          {!loading && !denied && !failed && data && data.users.length === 0 && (
            <EmptyState
              title={t('admin.users.emptyTitle')}
              description={t('admin.users.emptyDescription')}
            />
          )}
          {!loading && !denied && !failed && data && data.users.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t('admin.users.name')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.users.email')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.users.phone')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.users.role')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.users.joined')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.users.actions')}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.users.map((u) => (
                    <TableRow
                      key={u.id}
                      onClick={() => handleViewUser(u.id)}
                      className="cursor-pointer hover:bg-cream-50"
                    >
                      <TableCell>
                        <span className="font-medium text-ink-900">{u.name}</span>
                      </TableCell>
                      <TableCell className="break-all">{u.email}</TableCell>
                      <TableCell>{u.phone}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMIN' ? 'secondary' : 'primary'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-ink-500">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewUser(u.id)
                          }}
                        >
                          {t('admin.users.viewDetails')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                current={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={(p) => void load(p, undefined, appliedSearch)}
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
