import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { toRequestFailureKind, type RequestFailureKind } from '../lib/request-error'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { buildTelHref } from '../lib/resources'
import { useToast } from '../components/ui/toast-context'
import { useI18n } from '../lib/i18n'
import { Alert } from '../components/ui/Alert'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Checkbox } from '../components/ui/Checkbox'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterBar } from '../components/ui/FilterBar'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'
import { PhoneIcon } from '../components/ui/icons'

interface EmergencyContactRow {
  id: string
  userId: string
  name: string
  phone: string
  email?: string
  relationship?: string
  notifyViaSms: boolean
  notifyViaEmail: boolean
  isPrimary: boolean
  createdAt: string
  updatedAt: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
}

interface ContactSummary {
  totalContacts: number
  totalOwners: number
  alertsEnabled: number
}

interface ListResponse {
  contacts: EmergencyContactRow[]
  summary: ContactSummary
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

type FieldErrors = Record<string, string>

interface EditForm {
  name: string
  phone: string
  email: string
  relationship: string
  notifyViaSms: boolean
  notifyViaEmail: boolean
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

function boolVariant(value: boolean): BadgeVariant {
  return value ? 'success' : 'neutral'
}

function hasValidPhone(phone: string | undefined): boolean {
  return typeof phone === 'string' && phone.trim() !== ''
}

export function AdminEmergencyContactsPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<RequestFailureKind | null>(null)
  const [failureDetail, setFailureDetail] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<EmergencyContactRow | null>(null)
  const [viewTarget, setViewTarget] = useState<EmergencyContactRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContactRow | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      setFailure(null)
      setFailureDetail(null)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
        const res = await api<ListResponse>(`/admin/emergency-contacts?${params.toString()}`, signal ? { signal } : {})
        setData(res)
        setPage(res.pagination.page)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFailure(toRequestFailureKind(err))
        setFailureDetail(err instanceof ApiError ? err.message : null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [debouncedSearch],
  )

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  function openEdit(contact: EmergencyContactRow): void {
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? '',
      relationship: contact.relationship ?? '',
      notifyViaSms: contact.notifyViaSms,
      notifyViaEmail: contact.notifyViaEmail,
    })
    setFieldErrors({})
    setFormError(null)
    setEditTarget(contact)
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!form || !editTarget) return
    if (form.name.trim() === '' || form.phone.trim() === '') return
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      await api(`/admin/emergency-contacts/${editTarget.id}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          ...(form.email.trim() !== '' ? { email: form.email.trim() } : { email: undefined }),
          ...(form.relationship.trim() !== '' ? { relationship: form.relationship.trim() } : { relationship: undefined }),
          notifyViaSms: form.notifyViaSms,
          notifyViaEmail: form.notifyViaEmail,
        },
      })
      notify({ title: t('admin.emergencyContacts.updateSuccess'), variant: 'success' })
      setEditTarget(null)
      setForm(null)
      await load(page)
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(t('admin.emergencyContacts.serverUnreachable'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmDelete(): Promise<void> {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/admin/emergency-contacts/${deleteTarget.id}`, { method: 'DELETE' })
      notify({
        title: t('admin.emergencyContacts.deleteSuccess'),
        description: deleteTarget.name,
        variant: 'success',
      })
      setDeleteTarget(null)
      await load(page)
    } catch (err) {
      notify({
        title: t('admin.emergencyContacts.deleteError'),
        description: err instanceof ApiError ? err.message : t('admin.emergencyContacts.serverUnreachable'),
        variant: 'danger',
      })
    } finally {
      setDeleting(false)
    }
  }

  const filtersActive = search.trim() !== ''
  const failed = failure !== null
  const failureDescription =
    failure === 'unauthorized'
      ? t('auth.sessionExpired')
      : failure === 'denied'
        ? t('admin.emergencyContacts.accessDeniedDesc')
        : failure === 'failed'
          ? (failureDetail ?? t('admin.emergencyContacts.errorLoad'))
          : t('admin.emergencyContacts.serverUnreachable')

  const renderActions = (contact: EmergencyContactRow): React.ReactNode => (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasValidPhone(contact.phone) && (
        <a
          href={buildTelHref(contact.phone)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-100 px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
        >
          <PhoneIcon className="size-4" aria-hidden="true" />
          {t('admin.emergencyContacts.call')}
        </a>
      )}
      <Button size="sm" variant="outline" onClick={() => setViewTarget(contact)}>
        {t('admin.emergencyContacts.view')}
      </Button>
      <Button size="sm" variant="outline" onClick={() => openEdit(contact)}>
        {t('admin.emergencyContacts.edit')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(contact)}>
        {t('admin.emergencyContacts.delete')}
      </Button>
    </div>
  )

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <Card>
        <CardHeader
          title={t('admin.emergencyContacts.title')}
          description={t('admin.emergencyContacts.description')}
        />
      </Card>

      {(data || loading) && !failed && (
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-100 bg-white p-4">
              <dt className="text-sm font-medium text-ink-500">{t('admin.emergencyContacts.total')}</dt>
              <dd className="mt-1 text-3xl font-bold text-ink-900">{data?.summary.totalContacts ?? '—'}</dd>
            </div>
            <div className="rounded-xl border border-ink-100 bg-white p-4">
              <dt className="text-sm font-medium text-ink-500">{t('admin.emergencyContacts.totalUsers')}</dt>
              <dd className="mt-1 text-3xl font-bold text-gold-700 dark:text-gold-300">{data?.summary.totalOwners ?? '—'}</dd>
            </div>
            <div className="rounded-xl border border-ink-100 bg-white p-4">
              <dt className="text-sm font-medium text-ink-500">{t('admin.emergencyContacts.alertsEnabled')}</dt>
              <dd className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-300">{data?.summary.alertsEnabled ?? '—'}</dd>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-4">
          <FilterBar
            search={
              <SearchInput
                placeholder={t('admin.emergencyContacts.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            }
            resultCount={data && !loading && !failed ? <span>{t('admin.emergencyContacts.total')}: {data.pagination.total}</span> : undefined}
            onReset={filtersActive ? () => setSearch('') : undefined}
          />

          {loading && <Skeleton lines={5} />}

          {!loading && failure && (
            <ErrorState
              title={t('admin.emergencyContacts.errorLoad')}
              description={failureDescription}
              onRetry={() => void load(page)}
            />
          )}

          {!loading && !failed && data && data.contacts.length === 0 && (
            <EmptyState
              title={t('admin.emergencyContacts.emptyTitle')}
              description={filtersActive ? t('admin.emergencyContacts.emptyFiltered') : t('admin.emergencyContacts.emptyNone')}
            />
          )}

          {!loading && !failed && data && data.contacts.length > 0 && (
            <div className="space-y-4">
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t('admin.emergencyContacts.colName')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.emergencyContacts.colPhone')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.emergencyContacts.colRelationship')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.emergencyContacts.colSms')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.emergencyContacts.colEmailAlert')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.emergencyContacts.colOwnerName')}</TableHeaderCell>
                      <TableHeaderCell className="whitespace-nowrap">{t('admin.emergencyContacts.colCreated')}</TableHeaderCell>
                      <TableHeaderCell className="text-right">{t('admin.emergencyContacts.colActions')}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.contacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5 font-medium text-ink-900">
                            {c.name}
                            {c.isPrimary && (
                              <Badge variant="primary">{t('admin.emergencyContacts.primary')}</Badge>
                            )}
                          </span>
                          {c.email && <span className="block max-w-52 truncate text-xs text-ink-400">{c.email}</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {hasValidPhone(c.phone) ? (
                            <a href={buildTelHref(c.phone)} className="text-ink-700 underline-offset-2 hover:text-gold-600 hover:underline">
                              {c.phone}
                            </a>
                          ) : (
                            <span className="text-ink-400">{t('admin.emergencyContacts.noPhone')}</span>
                          )}
                        </TableCell>
                        <TableCell>{c.relationship || <span className="text-ink-400">—</span>}</TableCell>
                        <TableCell>
                          <Badge variant={boolVariant(c.notifyViaSms)} dot>
                            {c.notifyViaSms ? t('admin.emergencyContacts.yes') : t('admin.emergencyContacts.no')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={boolVariant(c.notifyViaEmail)} dot>
                            {c.notifyViaEmail ? t('admin.emergencyContacts.yes') : t('admin.emergencyContacts.no')}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{c.ownerName}</TableCell>
                        <TableCell className="whitespace-nowrap text-ink-500">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{renderActions(c)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-3 md:hidden">
                {data.contacts.map((c) => (
                  <li key={c.id} className="rounded-xl border border-ink-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink-900">
                          {c.name}
                          {c.isPrimary && (
                            <Badge variant="primary">{t('admin.emergencyContacts.primary')}</Badge>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {t('admin.emergencyContacts.colOwnerName')}: {c.ownerName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {c.notifyViaSms && <Badge variant="success">SMS</Badge>}
                        {c.notifyViaEmail && <Badge variant="success">Email</Badge>}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-ink-700">
                      {hasValidPhone(c.phone) ? (
                        <p>
                          <a href={buildTelHref(c.phone)} className="underline-offset-2 hover:text-gold-600 hover:underline">
                            {c.phone}
                          </a>
                        </p>
                      ) : (
                        <p className="text-ink-400">{t('admin.emergencyContacts.noPhone')}</p>
                      )}
                      {c.email && <p className="truncate text-ink-500">{c.email}</p>}
                      {(c.relationship || c.email) && (
                        <p className="text-ink-500">{c.relationship || t('admin.emergencyContacts.noRelationship')}</p>
                      )}
                      <p className="text-xs text-ink-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3">{renderActions(c)}</div>
                  </li>
                ))}
              </ul>

              <Pagination current={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={(p) => void load(p)} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* View Modal */}
      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={t('admin.emergencyContacts.viewDetails')}
        size="lg"
      >
        {viewTarget && (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="col-span-full mb-1 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.emergencyContacts.contactSection')}
              </p>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colName')}</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-1.5 font-medium text-ink-900">
                  {viewTarget.name}
                  {viewTarget.isPrimary && (
                    <Badge variant="primary">{t('admin.emergencyContacts.primary')}</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colPhone')}</dt>
                <dd className="mt-0.5 text-ink-900">
                  {hasValidPhone(viewTarget.phone) ? (
                    <a href={buildTelHref(viewTarget.phone)} className="underline-offset-2 hover:text-gold-600 hover:underline">
                      {viewTarget.phone}
                    </a>
                  ) : (
                    <span className="text-ink-400">{t('admin.emergencyContacts.noPhone')}</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colEmail')}</dt>
                <dd className="mt-0.5 break-words text-ink-900">{viewTarget.email || <span className="text-ink-400">{t('admin.emergencyContacts.noEmail')}</span>}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colRelationship')}</dt>
                <dd className="mt-0.5 text-ink-900">{viewTarget.relationship || <span className="text-ink-400">{t('admin.emergencyContacts.noRelationship')}</span>}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colCreated')}</dt>
                <dd className="mt-0.5 text-ink-900">{new Date(viewTarget.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.updated')}</dt>
                <dd className="mt-0.5 text-ink-900">{new Date(viewTarget.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="col-span-full mb-1 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.emergencyContacts.ownerSection')}
              </p>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colOwnerName')}</dt>
                <dd className="mt-0.5 text-ink-900">{viewTarget.ownerName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colOwnerPhone')}</dt>
                <dd className="mt-0.5 text-ink-900">{viewTarget.ownerPhone || <span className="text-ink-400">—</span>}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colOwnerEmail')}</dt>
                <dd className="mt-0.5 break-words text-ink-900">{viewTarget.ownerEmail || <span className="text-ink-400">—</span>}</dd>
              </div>
            </dl>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="col-span-full mb-1 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.emergencyContacts.alertsSection')}
              </p>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colSms')}</dt>
                <dd className="mt-0.5">
                  <Badge variant={boolVariant(viewTarget.notifyViaSms)} dot>
                    {viewTarget.notifyViaSms ? t('admin.emergencyContacts.yes') : t('admin.emergencyContacts.no')}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.emergencyContacts.colEmailAlert')}</dt>
                <dd className="mt-0.5">
                  <Badge variant={boolVariant(viewTarget.notifyViaEmail)} dot>
                    {viewTarget.notifyViaEmail ? t('admin.emergencyContacts.yes') : t('admin.emergencyContacts.no')}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {hasValidPhone(viewTarget.phone) && (
                <a
                  href={buildTelHref(viewTarget.phone)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-100 px-5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                >
                  <PhoneIcon className="size-4" aria-hidden="true" />
                  {t('admin.emergencyContacts.call')}
                </a>
              )}
              <Button size="md" variant="outline" onClick={() => { setViewTarget(null); openEdit(viewTarget) }}>
                {t('admin.emergencyContacts.edit')}
              </Button>
              <Button size="md" variant="secondary" onClick={() => setViewTarget(null)}>
                {t('admin.emergencyContacts.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editTarget !== null && form !== null}
        onClose={() => {
          if (!saving) {
            setEditTarget(null)
            setForm(null)
          }
        }}
        title={t('admin.emergencyContacts.editTitle')}
        size="lg"
      >
        {editTarget && form && (
          <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
            {formError && (
              <Alert variant="danger" title={t('admin.emergencyContacts.errorSave')} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('admin.emergencyContacts.formName')}
                name="contact-name"
                requiredMark
                value={form.name}
                error={fieldErrors.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
              />
              <Input
                label={t('admin.emergencyContacts.formPhone')}
                name="contact-phone"
                type="tel"
                requiredMark
                value={form.phone}
                error={fieldErrors.phone}
                onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
              />
              <Input
                label={t('admin.emergencyContacts.formEmail')}
                name="contact-email"
                type="email"
                value={form.email}
                error={fieldErrors.email}
                onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
              />
              <Input
                label={t('admin.emergencyContacts.formRelationship')}
                name="contact-relationship"
                value={form.relationship}
                error={fieldErrors.relationship}
                onChange={(e) => setForm((f) => (f ? { ...f, relationship: e.target.value } : f))}
              />
            </div>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="pb-1 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.emergencyContacts.alertsSection')}
              </legend>
              <Checkbox
                label={t('admin.emergencyContacts.formNotifySms')}
                checked={form.notifyViaSms}
                onChange={(e) => setForm((f) => (f ? { ...f, notifyViaSms: e.target.checked } : f))}
              />
              <Checkbox
                label={t('admin.emergencyContacts.formNotifyEmail')}
                checked={form.notifyViaEmail}
                onChange={(e) => setForm((f) => (f ? { ...f, notifyViaEmail: e.target.checked } : f))}
              />
            </fieldset>
            <ModalFooter
              cancelLabel={t('admin.emergencyContacts.cancel')}
              confirmLabel={t('admin.emergencyContacts.save')}
              saving={saving}
              onCancel={() => {
                if (!saving) {
                  setEditTarget(null)
                  setForm(null)
                }
              }}
            />
          </Form>
        )}
      </Modal>

      {/* Delete Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        variant="danger"
        title={t('admin.emergencyContacts.deleteTitle')}
        confirmLabel={t('admin.emergencyContacts.deleteConfirm')}
        confirmLoading={deleting}
        onConfirm={() => void onConfirmDelete()}
      >
        {deleteTarget && (
          <p className="text-sm text-ink-600">
            {t('admin.emergencyContacts.deleteBody', {
              name: deleteTarget.name,
              phone: deleteTarget.phone,
            })}
          </p>
        )}
      </Dialog>
    </div>
  )
}

function ModalFooter({
  cancelLabel,
  confirmLabel,
  saving,
  onCancel,
}: {
  cancelLabel: string
  confirmLabel: string
  saving: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <Button size="md" variant="secondary" onClick={onCancel} disabled={saving}>
        {cancelLabel}
      </Button>
      <Button size="md" variant="primary" type="submit" loading={saving} disabled={saving}>
        {confirmLabel}
      </Button>
    </div>
  )
}