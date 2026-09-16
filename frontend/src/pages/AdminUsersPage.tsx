import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import type { AuthUser } from '../lib/auth-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'

interface UsersResponse {
  users: AuthUser[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

function formatDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

export function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true)
    setFailed(false)
    setDenied(false)
    try {
      const res = await api<UsersResponse>(
        `/admin/users?page=${targetPage}&limit=10`,
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

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Card>
        <CardHeader
          title="Registered users"
          description="Admin-only view of the Users collection. Password hashes are never returned."
        />
        <CardBody>
          {loading && (
            <div className="space-y-2" aria-label="Loading users">
              <Skeleton lines={5} />
            </div>
          )}
          {!loading && denied && (
            <Alert variant="danger" title="Administrator access required">
              Your account does not have permission to view this page.
            </Alert>
          )}
          {!loading && failed && (
            <ErrorState
              title="Could not load users"
              description="The server could not be reached. Check that the backend and database are running."
              onRetry={() => void load(page)}
            />
          )}
          {!loading && !denied && !failed && data && data.users.length === 0 && (
            <EmptyState
              title="No users yet"
              description="Registered user accounts will appear here."
            />
          )}
          {!loading && !denied && !failed && data && data.users.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Phone</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Joined</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.users.map((u) => (
                    <TableRow key={u.id}>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                current={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={(p) => void load(p)}
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
