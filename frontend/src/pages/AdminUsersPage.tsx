import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import type { AuthUser } from '../lib/auth-context'
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
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { useI18n } from '../lib/i18n'
import { useToast } from '../components/ui/toast-context'

interface UsersResponse {
  users: AuthUser[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface EditModalState {
  mode: 'edit'
  user: AuthUser | null
}

interface DeleteModalState {
  user: AuthUser | null
}

type FieldErrors = Record<string, string>

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  language: '',
  role: '',
  isActive: true,
}

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

function formatDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

export function AdminUsersPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<UsersResponse | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [failed, setFailed] = useState(false)
  const [editModal, setEditModal] = useState<EditModalState | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  function openEditModal(user: AuthUser): void {
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
    setEditModal({ mode: 'edit', user })
  }

  function closeEditModal(): void {
    if (!saving) setEditModal(null)
  }

  function openDeleteModal(user: AuthUser): void {
    setDeleteModal({ user })
  }

  function closeDeleteModal(): void {
    if (!deleting) setDeleteModal(null)
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
      setEditModal(null)
      await load(page)
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
      setDeleteModal(null)
      await load(page)
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
                        <div className="flex flex-wrap gap-1.5">
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(u)
                            }}
                          >
                            {t('admin.users.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteModal(u)
                            }}
                          >
                            {t('admin.users.delete')}
                          </Button>
                        </div>
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

      <Modal
        open={editModal !== null}
        onClose={closeEditModal}
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
            <Button variant="ghost" onClick={closeEditModal}>
              {t('admin.users.cancel')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Dialog
        open={deleteModal !== null}
        onClose={closeDeleteModal}
        variant="danger"
        title={t('admin.users.deleteTitle', { name: deleteModal?.user?.name ?? '' })}
        confirmLabel={t('admin.users.deleteConfirm')}
        confirmLoading={deleting}
        onConfirm={() => void onConfirmDelete()}
      >
        {t('admin.users.deleteConfirmBody')}
      </Dialog>

    </div>
  )
}
