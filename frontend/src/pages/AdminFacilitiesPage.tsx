import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { toRequestFailureKind, type RequestFailureKind } from '../lib/request-error'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { FACILITY_TYPES, formatCoords, type Facility } from '../lib/resources'
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
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table'

interface ListResponse {
  facilities: Facility[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

type FieldErrors = Record<string, string>

interface ModalState {
  mode: 'create' | 'edit'
  facility?: Facility
}

const EMPTY_FORM = {
  name: '',
  facilityType: '',
  phone: '',
  capacity: '',
  isOperational: true,
  operatingHours: '',
  latitude: '',
  longitude: '',
  accuracy: '',
  city: '',
  address: '',
  state: '',
  country: '',
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

function statusVariant(operational: boolean): BadgeVariant {
  return operational ? 'success' : 'neutral'
}

function formatLocation(facility: Facility): React.ReactNode {
  const loc = facility.location
  if (!loc) return <span className="text-ink-400">—</span>

  const parts: string[] = []
  if (loc.address) parts.push(loc.address)
  if (loc.city) parts.push(loc.city)
  if (loc.state) parts.push(loc.state)
  if (loc.country) parts.push(loc.country)

  if (parts.length > 0) {
    return (
      <div className="space-y-0.5">
        <span className="text-ink-700">{parts.join(', ')}</span>
        <span className="text-xs text-ink-400">{formatCoords(loc.latitude, loc.longitude, loc.accuracy)}</span>
      </div>
    )
  }
  return <span className="text-ink-500">{formatCoords(loc.latitude, loc.longitude, loc.accuracy)}</span>
}

export function AdminFacilitiesPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<RequestFailureKind | null>(null)
  const [failureDetail, setFailureDetail] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Facility | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      setFailure(null)
      setFailureDetail(null)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (typeFilter) params.set('facilityType', typeFilter)
        if (statusFilter) params.set('isOperational', statusFilter)
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
        const res = await api<ListResponse>(`/admin/facilities?${params.toString()}`, signal ? { signal } : {})
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
    [typeFilter, statusFilter, debouncedSearch],
  )

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(1, controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  function resetFilters(): void {
    setTypeFilter('')
    setStatusFilter('')
    setSearch('')
    setPage(1)
  }

  function openCreate(): void {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(facility: Facility): void {
    const loc = facility.location
    setForm({
      name: facility.name,
      facilityType: facility.facilityType,
      phone: facility.phone,
      capacity: facility.capacity !== undefined ? String(facility.capacity) : '',
      isOperational: facility.isOperational,
      operatingHours: facility.operatingHours ?? '',
      latitude: loc ? String(loc.latitude) : '',
      longitude: loc ? String(loc.longitude) : '',
      accuracy: loc?.accuracy !== undefined ? String(loc.accuracy) : '',
      city: loc?.city ?? '',
      address: loc?.address ?? '',
      state: loc?.state ?? '',
      country: loc?.country ?? '',
    })
    setFieldErrors({})
    setFormError(null)
    setModal({ mode: 'edit', facility })
  }

  function locationChanged(facility: Facility): boolean {
    const loc = facility.location
    if (!loc) return form.latitude !== '' || form.longitude !== ''
    return (
      form.latitude !== String(loc.latitude) ||
      form.longitude !== String(loc.longitude) ||
      form.accuracy !== (loc.accuracy !== undefined ? String(loc.accuracy) : '') ||
      form.city !== (loc.city ?? '') ||
      form.address !== (loc.address ?? '') ||
      form.state !== (loc.state ?? '') ||
      form.country !== (loc.country ?? '')
    )
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!modal || saving) return
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const lat = form.latitude.trim() === '' ? NaN : Number(form.latitude)
      const lng = form.longitude.trim() === '' ? NaN : Number(form.longitude)
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        facilityType: form.facilityType,
        phone: form.phone.trim(),
        isOperational: form.isOperational,
      }
      if (form.capacity.trim() !== '') body.capacity = Number(form.capacity)
      if (form.operatingHours.trim() !== '') body.operatingHours = form.operatingHours.trim()
      const wantLocation =
        modal.mode === 'create' || (modal.facility !== undefined && locationChanged(modal.facility))
      if (wantLocation) {
        body.location = {
          latitude: lat,
          longitude: lng,
          ...(form.accuracy.trim() !== '' ? { accuracy: Number(form.accuracy) } : {}),
          ...(form.city.trim() !== '' ? { city: form.city.trim() } : {}),
          ...(form.address.trim() !== '' ? { address: form.address.trim() } : {}),
          ...(form.state.trim() !== '' ? { state: form.state.trim() } : {}),
          ...(form.country.trim() !== '' ? { country: form.country.trim() } : {}),
        }
      }
      if (modal.mode === 'create') {
        await api('/admin/facilities', { method: 'POST', body })
        notify({ title: t('admin.facilities.createSuccess'), description: form.name.trim(), variant: 'success' })
      } else if (modal.facility) {
        await api(`/admin/facilities/${modal.facility.id}`, { method: 'PATCH', body })
        notify({ title: t('admin.facilities.updateSuccess'), variant: 'success' })
      }
      setModal(null)
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
        setFormError(t('admin.facilities.serverUnreachable'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmToggle(): Promise<void> {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await api(`/admin/facilities/${toggleTarget.id}`, {
        method: 'PATCH',
        body: { isOperational: !toggleTarget.isOperational },
      })
      notify({
        title: toggleTarget.isOperational ? t('admin.facilities.deactivateSuccess') : t('admin.facilities.activateSuccess'),
        description: toggleTarget.name,
        variant: 'success',
      })
      setToggleTarget(null)
      await load(page)
    } catch (err) {
      notify({
        title: toggleTarget.isOperational ? t('admin.facilities.errorDeactivate') : t('admin.facilities.errorActivate'),
        description: err instanceof ApiError ? err.message : t('admin.facilities.serverUnreachable'),
        variant: 'danger',
      })
    } finally {
      setToggling(false)
    }
  }

  const filtersActive = typeFilter !== '' || statusFilter !== '' || search.trim() !== ''
  const failed = failure !== null
  const failureDescription =
    failure === 'unauthorized'
      ? t('auth.sessionExpired')
      : failure === 'denied'
        ? t('admin.facilities.accessDeniedDesc')
        : failure === 'failed'
          ? (failureDetail ?? t('admin.facilities.errorLoad'))
          : t('admin.facilities.serverUnreachable')
  const total = data?.pagination.total ?? 0
  const operational = data?.facilities.filter((f) => f.isOperational).length ?? 0
  const inactive = total - operational

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      {/* Page Header */}
      <Card>
        <CardHeader
          title={t('admin.facilities.title')}
          description={t('admin.facilities.description')}
          action={
            <Button size="md" variant="primary" onClick={openCreate}>
              {t('admin.facilities.add')}
            </Button>
          }
        />
      </Card>

      {/* Summary Cards */}
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <dt className="text-sm font-medium text-ink-500">{t('admin.facilities.total')}</dt>
            <dd className="mt-1 text-3xl font-bold text-ink-900">{total}</dd>
          </div>
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <dt className="text-sm font-medium text-ink-500">{t('admin.facilities.operational')}</dt>
            <dd className="mt-1 text-3xl font-bold text-emerald-600">{operational}</dd>
          </div>
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <dt className="text-sm font-medium text-ink-500">{t('admin.facilities.inactive')}</dt>
            <dd className="mt-1 text-3xl font-bold text-amber-600">{inactive}</dd>
          </div>
        </CardBody>
      </Card>

      {/* Filters & Table */}
      <Card>
        <CardBody className="space-y-4">
          <FilterBar
            search={
              <SearchInput
                placeholder={t('admin.facilities.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            }
            filters={
              <>
                <Select
                  aria-label={t('admin.facilities.type')}
                  className="w-40"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[{ label: t('admin.facilities.typeAll'), value: '' }, ...FACILITY_TYPES.map((t) => ({ label: t, value: t }))]}
                />
                <Select
                  aria-label={t('admin.facilities.status')}
                  className="w-36"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { label: t('admin.facilities.statusAll'), value: '' },
                    { label: t('admin.facilities.statusOperational'), value: 'true' },
                    { label: t('admin.facilities.statusInactive'), value: 'false' },
                  ]}
                />
              </>
            }
            resultCount={data && !loading && !failed ? <span>{t('admin.facilities.total')}: {data.pagination.total}</span> : undefined}
            onReset={filtersActive ? resetFilters : undefined}
          />

          {loading && <Skeleton lines={5} />}

          {!loading && failure && (
            <ErrorState
              title={t('admin.facilities.errorLoad')}
              description={failureDescription}
              onRetry={() => void load(page)}
            />
          )}

          {!loading && !failed && data && data.facilities.length === 0 && (
            <EmptyState
              title={t('admin.facilities.noFacilities')}
              description={filtersActive ? t('admin.facilities.noMatchFilters') : t('admin.facilities.noFacilitiesYet')}
              action={!filtersActive ? (
                <Button variant="primary" onClick={openCreate}>
                  {t('admin.facilities.addFirst')}
                </Button>
              ) : undefined}
            />
          )}

          {!loading && !failed && data && data.facilities.length > 0 && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t('admin.facilities.name')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.facilities.type')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.facilities.phone')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.facilities.location')}</TableHeaderCell>
                      <TableHeaderCell>{t('admin.facilities.status')}</TableHeaderCell>
                      <TableHeaderCell className="text-right">{t('admin.facilities.actions')}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.facilities.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <span className="font-medium text-ink-900">{f.name}</span>
                          {f.capacity !== undefined && (
                            <span className="block text-xs text-ink-400">{t('admin.facilities.capacity')} {f.capacity}</span>
                          )}
                        </TableCell>
                        <TableCell>{f.facilityType}</TableCell>
                        <TableCell>
                          <a href={`tel:${f.phone}`} className="text-ink-700 hover:text-gold-600 underline-offset-2 hover:underline">
                            {f.phone}
                          </a>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatLocation(f)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(f.isOperational)} dot>
                            {f.isOperational ? t('admin.facilities.statusOperational') : t('admin.facilities.statusInactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                              {t('admin.facilities.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant={f.isOperational ? 'ghost' : 'secondary'}
                              onClick={() => setToggleTarget(f)}
                            >
                              {f.isOperational ? t('admin.facilities.deactivate') : t('admin.facilities.activate')}
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
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={modal !== null}
        onClose={() => {
          if (!saving) setModal(null)
        }}
        title={modal?.mode === 'edit' ? t('admin.facilities.edit') : t('admin.facilities.add')}
        description="Coordinates are stored as a location record — never invented."
        size="lg"
      >
        <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
          {formError && (
            <Alert variant="danger" title={t('admin.facilities.errorCreate')} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('admin.facilities.name')}
              name="facility-name"
              requiredMark
              value={form.name}
              error={fieldErrors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              label={t('admin.facilities.type')}
              name="facility-type"
              requiredMark
              value={form.facilityType}
              error={fieldErrors.facilityType}
              onChange={(e) => setForm((f) => ({ ...f, facilityType: e.target.value }))}
              placeholder={t('admin.facilities.typeAll')}
              options={FACILITY_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Input
              label={t('admin.facilities.phone')}
              name="facility-phone"
              type="tel"
              requiredMark
              value={form.phone}
              error={fieldErrors.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.capacity')}
              name="facility-capacity"
              type="number"
              min="0"
              step="1"
              value={form.capacity}
              error={fieldErrors.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.operatingHours')}
              name="facility-hours"
              placeholder="24x7"
              value={form.operatingHours}
              error={fieldErrors.operatingHours}
              onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.city')}
              name="facility-city"
              value={form.city}
              error={fieldErrors['location.city']}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.state')}
              name="facility-state"
              value={form.state}
              error={fieldErrors['location.state']}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.country')}
              name="facility-country"
              value={form.country}
              error={fieldErrors['location.country']}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.latitude')}
              name="facility-latitude"
              requiredMark
              placeholder="19.0760"
              value={form.latitude}
              error={fieldErrors['location.latitude']}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.longitude')}
              name="facility-longitude"
              requiredMark
              placeholder="72.8777"
              value={form.longitude}
              error={fieldErrors['location.longitude']}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.accuracy')}
              name="facility-accuracy"
              type="number"
              min="0"
              value={form.accuracy}
              error={fieldErrors['location.accuracy']}
              onChange={(e) => setForm((f) => ({ ...f, accuracy: e.target.value }))}
            />
            <Input
              label={t('admin.facilities.address')}
              name="facility-address"
              value={form.address}
              error={fieldErrors['location.address']}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          {fieldErrors.location && <Alert variant="danger">{fieldErrors.location}</Alert>}
          <Checkbox
            label={t('admin.facilities.statusOperational')}
            checked={form.isOperational}
            onChange={(e) => setForm((f) => ({ ...f, isOperational: e.target.checked }))}
          />
          <div className="flex flex-wrap gap-3 mt-4">
            <Button type="submit" loading={saving} disabled={saving}>
              {modal?.mode === 'edit' ? t('admin.facilities.save') : t('admin.facilities.add')}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t('admin.facilities.cancel')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Activate/Deactivate Dialog */}
      <Dialog
        open={toggleTarget !== null}
        onClose={() => {
          if (!toggling) setToggleTarget(null)
        }}
        variant={toggleTarget?.isOperational ? 'danger' : 'default'}
        title={toggleTarget?.isOperational ? t('admin.facilities.deactivateTitle') : t('admin.facilities.activateTitle')}
        confirmLabel={toggleTarget?.isOperational ? t('admin.facilities.deactivate') : t('admin.facilities.activate')}
        cancelLabel={t('admin.facilities.cancel')}
        confirmLoading={toggling}
        onConfirm={() => void onConfirmToggle()}
      >
        {toggleTarget?.isOperational ? t('admin.facilities.deactivateConfirm') : t('admin.facilities.activateConfirm')}
      </Dialog>

      <Alert variant="info" title={t('resources.facility.about.title')}>
        {t('resources.facility.about.body')}
      </Alert>
    </div>
  )
}