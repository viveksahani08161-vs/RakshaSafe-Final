import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { TEAM_TYPES, type RescueTeam } from '../lib/resources'
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
  teams: RescueTeam[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
}

type FieldErrors = Record<string, string>

interface ModalState {
  mode: 'create' | 'edit'
  team?: RescueTeam
}

const EMPTY_FORM = {
  name: '',
  teamType: '',
  phone: '',
  email: '',
  isActive: true,
  specializations: '',
  address: '',
  city: '',
  state: '',
  country: '',
  latitude: '',
  longitude: '',
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

function statusVariant(active: boolean): BadgeVariant {
  return active ? 'success' : 'neutral'
}

export function AdminTeamsPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [data, setData] = useState<ListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toggleTarget, setToggleTarget] = useState<RescueTeam | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [membersTeam, setMembersTeam] = useState<RescueTeam | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberFieldError, setMemberFieldError] = useState<string | null>(null)
  const [memberBusy, setMemberBusy] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      setFailed(false)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (typeFilter) params.set('teamType', typeFilter)
        if (statusFilter) params.set('isActive', statusFilter)
        if (search.trim()) params.set('search', search.trim())
        const res = await api<ListResponse>(`/admin/rescue-teams?${params.toString()}`, signal ? { signal } : {})
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

  function openEdit(team: RescueTeam): void {
    setForm({
      name: team.name,
      teamType: team.teamType,
      phone: team.phone,
      email: team.email ?? '',
      isActive: team.isActive,
      specializations: team.specializations.join(', '),
      address: team.location?.address ?? '',
      city: team.location?.city ?? '',
      state: team.location?.state ?? '',
      country: team.location?.country ?? '',
      latitude: team.location ? String(team.location.latitude) : '',
      longitude: team.location ? String(team.location.longitude) : '',
    })
    setFieldErrors({})
    setFormError(null)
    setModal({ mode: 'edit', team })
  }

  function parseSpecializations(raw: string): string[] {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
  }

  /**
   * Build the optional inline location payload. Returns undefined when the
   * fields are empty (create: no location; edit: preserve the stored one)
   * or when nothing changed versus the loaded team (edit: preserve).
   * Numbers are parsed here so the backend receives real numbers, never
   * numeric strings; invalid input is rejected server-side with field errors.
   */
  function buildLocationInput(): Record<string, unknown> | undefined {
    const address = form.address.trim()
    const city = form.city.trim()
    const state = form.state.trim()
    const country = form.country.trim()
    const latRaw = form.latitude.trim()
    const lngRaw = form.longitude.trim()
    if (modal?.mode === 'edit' && modal.team) {
      const existing = modal.team.location
      const same =
        (existing?.address ?? '') === address &&
        (existing?.city ?? '') === city &&
        (existing?.state ?? '') === state &&
        (existing?.country ?? '') === country &&
        (existing ? String(existing.latitude) : '') === latRaw &&
        (existing ? String(existing.longitude) : '') === lngRaw
      if (same) return undefined
      if (!existing && latRaw === '' && lngRaw === '' && !address && !city && !state && !country) {
        return undefined
      }
    } else if (latRaw === '' && lngRaw === '' && !address && !city && !state && !country) {
      return undefined
    }
    const location: Record<string, unknown> = {
      latitude: latRaw === '' ? undefined : Number(latRaw),
      longitude: lngRaw === '' ? undefined : Number(lngRaw),
    }
    if (address) location.address = address
    if (city) location.city = city
    if (state) location.state = state
    if (country) location.country = country
    return location
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!modal) return
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        teamType: form.teamType,
        phone: form.phone.trim(),
        isActive: form.isActive,
        specializations: parseSpecializations(form.specializations),
      }
      if (form.email.trim() !== '') body.email = form.email.trim()
      const locationInput = buildLocationInput()
      if (locationInput) body.location = locationInput
      if (modal.mode === 'create') {
        await api('/admin/rescue-teams', { method: 'POST', body })
        notify({ title: 'Rescue team created', description: form.name.trim(), variant: 'success' })
      } else if (modal.team) {
        await api(`/admin/rescue-teams/${modal.team.id}`, { method: 'PATCH', body })
        notify({ title: 'Rescue team updated', variant: 'success' })
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
      await api(`/admin/rescue-teams/${toggleTarget.id}`, {
        method: 'PATCH',
        body: { isActive: !toggleTarget.isActive },
      })
      notify({
        title: toggleTarget.isActive ? 'Team deactivated' : 'Team activated',
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

  async function openMembers(team: RescueTeam): Promise<void> {
    setMembersTeam(team)
    setMembers([])
    setMembersError(null)
    setMemberUserId('')
    setMemberFieldError(null)
    setMembersLoading(true)
    try {
      const res = await api<{ members: TeamMember[] }>(`/admin/rescue-teams/${team.id}/members`)
      setMembers(res.members)
    } catch (err) {
      setMembersError(err instanceof ApiError ? err.message : 'Could not load members.')
    } finally {
      setMembersLoading(false)
    }
  }

  async function onAddMember(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!membersTeam) return
    setMemberBusy(true)
    setMemberFieldError(null)
    setMembersError(null)
    try {
      const res = await api<{ team: RescueTeam }>(`/admin/rescue-teams/${membersTeam.id}/members`, {
        method: 'POST',
        body: { userId: memberUserId.trim() },
      })
      notify({ title: 'Responder linked', description: membersTeam.name, variant: 'success' })
      setMemberUserId('')
      setMembersTeam(res.team)
      const refreshed = await api<{ members: TeamMember[] }>(
        `/admin/rescue-teams/${membersTeam.id}/members`,
      )
      setMembers(refreshed.members)
      await load(page)
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (fields.userId) {
          setMemberFieldError(fields.userId)
        } else {
          setMembersError(err.message)
        }
      } else {
        setMembersError('Something went wrong. Please try again.')
      }
    } finally {
      setMemberBusy(false)
    }
  }

  async function onRemoveMember(memberId: string): Promise<void> {
    if (!membersTeam) return
    setRemovingId(memberId)
    try {
      const res = await api<{ team: RescueTeam }>(
        `/admin/rescue-teams/${membersTeam.id}/members/${memberId}`,
        { method: 'DELETE' },
      )
      notify({ title: 'Responder unlinked', variant: 'info' })
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setMembersTeam(res.team)
      await load(page)
    } catch (err) {
      notify({
        title: 'Remove failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setRemovingId(null)
    }
  }

  const filtersActive = typeFilter !== '' || statusFilter !== '' || search.trim() !== ''

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card>
        <CardHeader
          title="Rescue teams"
          description="Registered response teams. Deactivation hides them from users; nothing is hard-deleted."
          action={
            <Button size="sm" variant="primary" onClick={openCreate}>
              + Add Team
            </Button>
          }
        />
        <CardBody>
          <div className="space-y-4">
            <FilterBar
              search={
                <SearchInput
                  placeholder="Search teams…"
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
                    options={[{ label: 'All types', value: '' }, ...TEAM_TYPES.map((t) => ({ label: t, value: t }))]}
                  />
                  <Select
                    aria-label="Filter by status"
                    className="w-36"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { label: 'All statuses', value: '' },
                      { label: 'Active', value: 'true' },
                      { label: 'Inactive', value: 'false' },
                    ]}
                  />
                </>
              }
              resultCount={data && !loading && !failed ? <span>{data.pagination.total} teams</span> : undefined}
              onReset={filtersActive ? resetFilters : undefined}
            />
            {loading && <Skeleton lines={5} />}
            {!loading && failed && (
              <ErrorState title="Could not load teams" description="The server could not be reached." onRetry={() => void load(page)} />
            )}
            {!loading && !failed && data && data.teams.length === 0 && (
              <EmptyState title="No teams found" description={filtersActive ? 'No teams match the current filters.' : 'Register the first response team.'} />
            )}
            {!loading && !failed && data && data.teams.length > 0 && (
              <div className="space-y-4">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Contact</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.teams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <span className="font-medium text-ink-900">{t.name}</span>
                          {t.specializations.length > 0 && (
                            <span className="block max-w-56 truncate text-xs text-ink-400">
                              {t.specializations.join(', ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{t.teamType}</TableCell>
                        <TableCell>
                          <span className="block">{t.phone}</span>
                          {t.email && <span className="block max-w-56 truncate text-xs text-ink-400">{t.email}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(t.isActive)} dot>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="block text-xs text-ink-400">
                            {t.members.length} responder{t.members.length === 1 ? '' : 's'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void openMembers(t)}>
                              Members
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setToggleTarget(t)}>
                              {t.isActive ? 'Deactivate' : 'Activate'}
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
        title={modal?.mode === 'edit' ? 'Edit rescue team' : 'Add rescue team'}
        description="Registration records only — never a guarantee of physical response."
      >
        <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
          {formError && (
            <Alert variant="danger" title="Could not save team" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <Input label="Team name" name="team-name" requiredMark value={form.name} error={fieldErrors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select
            label="Team type"
            name="team-type"
            requiredMark
            value={form.teamType}
            error={fieldErrors.teamType}
            onChange={(e) => setForm((f) => ({ ...f, teamType: e.target.value }))}
            placeholder="Select type"
            options={TEAM_TYPES.map((t) => ({ label: t, value: t }))}
          />
          <Input label="Phone" name="team-phone" type="tel" requiredMark value={form.phone} error={fieldErrors.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label="Email (optional)" name="team-email" type="email" value={form.email} error={fieldErrors.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input
            label="Specializations (optional, comma separated)"
            name="team-specializations"
            placeholder="First aid, Flood rescue"
            value={form.specializations}
            error={fieldErrors.specializations}
            onChange={(e) => setForm((f) => ({ ...f, specializations: e.target.value }))}
          />
          <fieldset className="space-y-3 rounded-xl border border-ink-200/70 p-4">
            <legend className="px-1 text-sm font-bold text-ink-900">{t('admin.team.location.title')}</legend>
            <p className="text-xs leading-relaxed text-ink-500">{t('admin.team.location.hint')}</p>
            <Input label={t('admin.team.location.address')} name="team-address" value={form.address} error={fieldErrors['location.address']} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label={t('admin.team.location.city')} name="team-city" value={form.city} error={fieldErrors['location.city']} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <Input label={t('admin.team.location.state')} name="team-state" value={form.state} error={fieldErrors['location.state']} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              <Input label={t('admin.team.location.country')} name="team-country" value={form.country} error={fieldErrors['location.country']} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('admin.team.location.latitude')} name="team-latitude" inputMode="decimal" value={form.latitude} error={fieldErrors['location.latitude']} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
              <Input label={t('admin.team.location.longitude')} name="team-longitude" inputMode="decimal" value={form.longitude} error={fieldErrors['location.longitude']} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
            </div>
          </fieldset>
          <Checkbox label="Active (visible to users)" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              {modal?.mode === 'edit' ? 'Save changes' : 'Add team'}
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
        variant={toggleTarget?.isActive ? 'danger' : 'default'}
        title={toggleTarget?.isActive ? `Deactivate ${toggleTarget?.name}?` : `Activate ${toggleTarget?.name}?`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        confirmLoading={toggling}
        onConfirm={() => void onConfirmToggle()}
      >
        {toggleTarget?.isActive
          ? 'Users will no longer see this team in resources.'
          : 'Users will see this team in resources again.'}
      </Dialog>

      <Modal
        open={membersTeam !== null}
        onClose={() => setMembersTeam(null)}
        title={membersTeam ? `Responders — ${membersTeam.name}` : 'Responders'}
        description="Only linked RESPONDER accounts see this team's assignments. Membership never exposes passwords."
      >
        {membersLoading && <Skeleton lines={3} />}
        {!membersLoading && membersError && (
          <Alert variant="danger" title="Could not load members" onClose={() => setMembersError(null)}>
            {membersError}
          </Alert>
        )}
        {!membersLoading && !membersError && members.length === 0 && (
          <EmptyState
            title="No responders linked"
            description="Link a RESPONDER account below so its owner can accept this team's assignments."
          />
        )}
        {!membersLoading && !membersError && members.length > 0 && (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200/70 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{m.name}</p>
                  <p className="truncate text-xs text-ink-400">
                    {m.email} · {m.phone} · {m.role}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removingId === m.id}
                  onClick={() => void onRemoveMember(m.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Form onSubmit={(e: FormEvent) => void onAddMember(e)}>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="Responder user id"
              name="member-user-id"
              placeholder="Paste the RESPONDER account id…"
              value={memberUserId}
              error={memberFieldError}
              onChange={(e) => setMemberUserId(e.target.value)}
            />
            <Button type="submit" loading={memberBusy} disabled={memberBusy}>
              Link responder
            </Button>
          </div>
          <p className="text-xs text-ink-500">
            Only accounts with the RESPONDER role can be linked. Create them with the
            responder seed script or promote them administratively.
          </p>
        </Form>
      </Modal>
    </div>
  )
}
