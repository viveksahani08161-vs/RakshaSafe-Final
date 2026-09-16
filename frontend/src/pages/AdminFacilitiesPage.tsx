import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { FACILITY_TYPES, formatCoords, type Facility } from '../lib/resources'
import { useToast } from '../components/ui/toast-context'
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

export function AdminFacilitiesPage() {
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
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
      setFailed(false)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (typeFilter) params.set('facilityType', typeFilter)
        if (statusFilter) params.set('isOperational', statusFilter)
        if (search.trim()) params.set('search', search.trim())
        const res = await api<ListResponse>(`/admin/facilities?${params.toString()}`, signal ? { signal } : {})
        setData(res)
        setPage(res.pagination.page)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFailed(true)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [typeFilter, statusFilter, search],
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
    setForm({
      name: facility.name,
      facilityType: facility.facilityType,
      phone: facility.phone,
      capacity: facility.capacity !== undefined ? String(facility.capacity) : '',
      isOperational: facility.isOperational,
      operatingHours: facility.operatingHours ?? '',
      latitude: facility.location ? String(facility.location.latitude) : '',
      longitude: facility.location ? String(facility.location.longitude) : '',
      accuracy: facility.location?.accuracy !== undefined ? String(facility.location.accuracy) : '',
      city: facility.location?.city ?? '',
      address: facility.location?.address ?? '',
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
      form.address !== (loc.address ?? '')
    )
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!modal) return
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
        }
      }
      if (modal.mode === 'create') {
        await api('/admin/facilities', { method: 'POST', body })
        notify({ title: 'Facility created', description: form.name.trim(), variant: 'success' })
      } else if (modal.facility) {
        await api(`/admin/facilities/${modal.facility.id}`, { method: 'PATCH', body })
        notify({ title: 'Facility updated', variant: 'success' })
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
        setFormError('Something went wrong. Please try again.')
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
        title: toggleTarget.isOperational ? 'Facility deactivated' : 'Facility activated',
        description: toggleTarget.name,
        variant: 'info',
      })
      setToggleTarget(null)
      await load(page)
    } catch (err) {
      notify({
        title: 'Update failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setToggling(false)
    }
  }

  const filtersActive = typeFilter !== '' || statusFilter !== '' || search.trim() !== ''

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card>
        <CardHeader
          title="Facilities"
          description="Hospitals, shelters, stations and relief centres. Deactivation hides them from users; nothing is hard-deleted."
          action={
            <Button size="sm" variant="primary" onClick={openCreate}>
              + Add Facility
            </Button>
          }
        />
        <CardBody>
          <div className="space-y-4">
            <FilterBar
              search={
                <SearchInput
                  placeholder="Search facilities…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />
              }
              filters={
                <>
                  <Select
                    aria-label="Filter by type"
                    className="w-40"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    options={[{ label: 'All types', value: '' }, ...FACILITY_TYPES.map((t) => ({ label: t, value: t }))]}
                  />
                  <Select
                    aria-label="Filter by status"
                    className="w-36"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { label: 'All statuses', value: '' },
                      { label: 'Operational', value: 'true' },
                      { label: 'Inactive', value: 'false' },
                    ]}
                  />
                </>
              }
              resultCount={data && !loading && !failed ? <span>{data.pagination.total} facilities</span> : undefined}
              onReset={filtersActive ? resetFilters : undefined}
            />
            {loading && <Skeleton lines={5} />}
            {!loading && failed && (
              <ErrorState title="Could not load facilities" description="The server could not be reached." onRetry={() => void load(page)} />
            )}
            {!loading && !failed && data && data.facilities.length === 0 && (
              <EmptyState title="No facilities found" description={filtersActive ? 'No facilities match the current filters.' : 'Add the first facility record.'} />
            )}
            {!loading && !failed && data && data.facilities.length > 0 && (
              <div className="space-y-4">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Phone</TableHeaderCell>
                      <TableHeaderCell>Location</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.facilities.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <span className="font-medium text-ink-900">{f.name}</span>
                          {f.capacity !== undefined && (
                            <span className="block text-xs text-ink-400">Capacity {f.capacity}</span>
                          )}
                        </TableCell>
                        <TableCell>{f.facilityType}</TableCell>
                        <TableCell>{f.phone}</TableCell>
                        <TableCell className="whitespace-nowrap text-ink-500">
                          {f.location ? formatCoords(f.location.latitude, f.location.longitude) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(f.isOperational)} dot>
                            {f.isOperational ? 'Operational' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setToggleTarget(f)}>
                              {f.isOperational ? 'Deactivate' : 'Activate'}
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
        open={modal !== null}
        onClose={() => {
          if (!saving) setModal(null)
        }}
        title={modal?.mode === 'edit' ? 'Edit facility' : 'Add facility'}
        description="Coordinates are stored as a location record — never invented."
        size="lg"
      >
        <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
          {formError && (
            <Alert variant="danger" title="Could not save facility" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" requiredMark value={form.name} error={fieldErrors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Select
              label="Type"
              requiredMark
              value={form.facilityType}
              error={fieldErrors.facilityType}
              onChange={(e) => setForm((f) => ({ ...f, facilityType: e.target.value }))}
              placeholder="Select type"
              options={FACILITY_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Input label="Phone" type="tel" requiredMark value={form.phone} error={fieldErrors.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Capacity (optional)" type="number" min="0" step="1" value={form.capacity} error={fieldErrors.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            <Input label="Operating hours (optional)" placeholder="24x7" value={form.operatingHours} error={fieldErrors.operatingHours} onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))} />
            <Input label="City (optional)" value={form.city} error={fieldErrors['location.city']} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <Input label="Latitude" requiredMark placeholder="19.0760" value={form.latitude} error={fieldErrors['location.latitude']} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
            <Input label="Longitude" requiredMark placeholder="72.8777" value={form.longitude} error={fieldErrors['location.longitude']} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
            <Input label="Accuracy m (optional)" type="number" min="0" value={form.accuracy} error={fieldErrors['location.accuracy']} onChange={(e) => setForm((f) => ({ ...f, accuracy: e.target.value }))} />
            <Input label="Address (optional)" value={form.address} error={fieldErrors['location.address']} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          {fieldErrors.location && <Alert variant="danger">{fieldErrors.location}</Alert>}
          <Checkbox label="Operational (visible to users)" checked={form.isOperational} onChange={(e) => setForm((f) => ({ ...f, isOperational: e.target.checked }))} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              {modal?.mode === 'edit' ? 'Save changes' : 'Add facility'}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
          </div>
        </Form>
      </Modal>

      <Dialog
        open={toggleTarget !== null}
        onClose={() => {
          if (!toggling) setToggleTarget(null)
        }}
        variant={toggleTarget?.isOperational ? 'danger' : 'default'}
        title={toggleTarget?.isOperational ? `Deactivate ${toggleTarget?.name}?` : `Activate ${toggleTarget?.name}?`}
        confirmLabel={toggleTarget?.isOperational ? 'Deactivate' : 'Activate'}
        confirmLoading={toggling}
        onConfirm={() => void onConfirmToggle()}
      >
        {toggleTarget?.isOperational
          ? 'Users will no longer see this facility in resources.'
          : 'Users will see this facility in resources again.'}
      </Dialog>

      <Alert variant="info" title="Stored information only">
        Operating hours and capacity are maintained records. This app has no live availability feed.
      </Alert>
    </div>
  )
}
