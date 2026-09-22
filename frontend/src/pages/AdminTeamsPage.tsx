import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { TEAM_TYPES, buildTelHref, type RescueTeam } from '../lib/resources'
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
  const [denied, setDenied] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [viewTeam, setViewTeam] = useState<RescueTeam | null>(null)
  const [viewDetail, setViewDetail] = useState<RescueTeam | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
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
      setDenied(false)
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: '10' })
        if (typeFilter) params.set('teamType', typeFilter)
        if (statusFilter) params.set('isActive', statusFilter)
        if (search.trim()) params.set('search', search.trim())
        const res = await api<ListResponse>(`/admin/rescue-teams?${params.toString()}`, signal ? { signal } : {})
        if (signal?.aborted) return
        setData(res)
        setPage(res.pagination.page)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (signal?.aborted) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setDenied(true)
        } else {
          setFailed(true)
        }
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
        notify({ title: t('admin.teams.created'), description: form.name.trim(), variant: 'success' })
      } else if (modal.team) {
        await api(`/admin/rescue-teams/${modal.team.id}`, { method: 'PATCH', body })
        notify({ title: t('admin.teams.updated'), variant: 'success' })
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
        setFormError(t('admin.teams.form.saveError'))
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
        title: toggleTarget.isActive ? t('admin.teams.deactivated') : t('admin.teams.activated'),
        description: toggleTarget.name,
        variant: 'info',
      })
      setToggleTarget(null)
      await load(page)
    } catch (err) {
      notify({
        title: t('admin.teams.updateFailed'),
        description: err instanceof ApiError ? err.message : t('admin.teams.serverUnreachable'),
        variant: 'danger',
      })
    } finally {
      setToggling(false)
    }
  }

  async function openView(team: RescueTeam): Promise<void> {
    setViewTeam(team)
    setViewDetail(null)
    setViewLoading(true)
    try {
      const res = await api<{ team: RescueTeam }>(`/admin/rescue-teams/${team.id}`)
      setViewDetail(res.team)
    } catch (err) {
      notify({
        title: t('admin.teams.detail.loadFailed'),
        description: err instanceof ApiError ? err.message : t('admin.teams.serverUnreachable'),
        variant: 'danger',
      })
      setViewTeam(null)
    } finally {
      setViewLoading(false)
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
      setMembersError(err instanceof ApiError ? err.message : t('admin.teams.membersLoadFailed'))
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
      notify({ title: t('admin.teams.linked'), description: membersTeam.name, variant: 'success' })
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
        setMembersError(t('admin.teams.form.saveError'))
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
      notify({ title: t('admin.teams.unlinked'), variant: 'info' })
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setMembersTeam(res.team)
      await load(page)
    } catch (err) {
      notify({
        title: t('admin.teams.removeFailed'),
        description: err instanceof ApiError ? err.message : t('admin.teams.serverUnreachable'),
        variant: 'danger',
      })
    } finally {
      setRemovingId(null)
    }
  }

  const filtersActive = typeFilter !== '' || statusFilter !== '' || search.trim() !== ''

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card className="min-w-0">
        <CardHeader
          title={t('admin.teams.title')}
          description={t('admin.teams.description')}
          action={
            <Button size="sm" variant="primary" onClick={openCreate}>
              + {t('admin.teams.add')}
            </Button>
          }
        />
        <CardBody>
          <div className="space-y-4">
            <FilterBar
              search={
                <SearchInput
                  placeholder={t('admin.teams.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />
              }
              filters={
                <>
                  <Select
                    aria-label={t('admin.teams.filterTypeAria')}
                    className="w-40"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    options={[{ label: t('admin.teams.typeAll'), value: '' }, ...TEAM_TYPES.map((ty) => ({ label: ty, value: ty }))]}
                  />
                  <Select
                    aria-label={t('admin.teams.filterStatusAria')}
                    className="w-36"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { label: t('admin.teams.statusAll'), value: '' },
                      { label: t('admin.teams.active'), value: 'true' },
                      { label: t('admin.teams.inactive'), value: 'false' },
                    ]}
                  />
                </>
              }
              resultCount={data && !loading && !failed ? <span>{t('admin.teams.count', { total: data.pagination.total })}</span> : undefined}
              onReset={filtersActive ? resetFilters : undefined}
            />
            {loading && <Skeleton lines={5} />}
            {!loading && (failed || denied) && (
              <ErrorState
                title={denied ? t('admin.teams.accessDenied') : t('admin.teams.errorLoad')}
                description={denied ? t('admin.teams.accessDeniedDesc') : t('admin.teams.serverUnreachable')}
                onRetry={() => void load(page)}
              />
            )}
            {!loading && !failed && !denied && data && data.teams.length === 0 && (
              <EmptyState
                title={t('admin.teams.emptyTitle')}
                description={filtersActive ? t('admin.teams.emptyFiltered') : t('admin.teams.emptyFirst')}
                action={
                  !filtersActive ? (
                    <Button size="sm" variant="primary" onClick={openCreate}>
                      + {t('admin.teams.add')}
                    </Button>
                  ) : undefined
                }
              />
            )}
            {!loading && !failed && !denied && data && data.teams.length > 0 && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell scope="col">{t('admin.teams.colName')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.teams.colType')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.teams.colContact')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.teams.colStatus')}</TableHeaderCell>
                      <TableHeaderCell scope="col">{t('admin.teams.colActions')}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => void openView(team)}
                            className="max-w-56 truncate text-left font-medium text-ink-900 underline-offset-2 hover:text-gold-700 hover:underline"
                            aria-label={`${t('admin.teams.view')}: ${team.name}`}
                          >
                            {team.name}
                          </button>
                          {team.specializations.length > 0 && (
                            <span className="block max-w-56 truncate text-xs text-ink-400">
                              {team.specializations.join(', ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary">{team.teamType}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="block break-words">{team.phone}</span>
                          <a
                            href={buildTelHref(team.phone)}
                            className="mt-0.5 inline-block text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                            aria-label={`${t('admin.teams.call')}: ${team.name}`}
                          >
                            {t('admin.teams.call')}
                          </a>
                          {team.email && <span className="block max-w-56 truncate text-xs text-ink-400">{team.email}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(team.isActive)} dot>
                            {team.isActive ? t('admin.teams.active') : t('admin.teams.inactive')}
                          </Badge>
                          <span className="block whitespace-nowrap text-xs text-ink-400">
                            {t('admin.teams.memberCount', { count: team.members.length })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => void openView(team)}>
                              {t('admin.teams.view')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(team)}>
                              {t('admin.teams.edit')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void openMembers(team)}>
                              {t('admin.teams.members')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setToggleTarget(team)}>
                              {team.isActive ? t('admin.teams.deactivate') : t('admin.teams.activate')}
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
        open={modal !== null}
        onClose={() => {
          if (!saving) setModal(null)
        }}
        title={modal?.mode === 'edit' ? t('admin.teams.form.editTitle') : t('admin.teams.form.addTitle')}
        description={t('admin.teams.form.hint')}
      >
        <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
          {formError && (
            <Alert variant="danger" title={t('admin.teams.form.saveError')} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <Input label={t('admin.teams.form.name')} name="team-name" requiredMark value={form.name} error={fieldErrors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select
            label={t('admin.teams.form.type')}
            name="team-type"
            requiredMark
            value={form.teamType}
            error={fieldErrors.teamType}
            onChange={(e) => setForm((f) => ({ ...f, teamType: e.target.value }))}
            placeholder={t('admin.teams.form.type')}
            options={TEAM_TYPES.map((ty) => ({ label: ty, value: ty }))}
          />
          <Input label={t('admin.teams.form.phone')} name="team-phone" type="tel" requiredMark value={form.phone} error={fieldErrors.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label={t('admin.teams.form.email')} name="team-email" type="email" value={form.email} error={fieldErrors.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input
            label={t('admin.teams.form.specializations')}
            name="team-specializations"
            placeholder={t('admin.teams.form.specializationsPh')}
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
          <Checkbox label={t('admin.teams.form.active')} checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              {modal?.mode === 'edit' ? t('admin.teams.save') : t('admin.teams.addSubmit')}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t('admin.teams.cancel')}
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
        title={
          toggleTarget
            ? toggleTarget.isActive
              ? t('admin.teams.deactivateTitle', { name: toggleTarget.name })
              : t('admin.teams.activateTitle', { name: toggleTarget.name })
            : ''
        }
        confirmLabel={toggleTarget?.isActive ? t('admin.teams.deactivate') : t('admin.teams.activate')}
        cancelLabel={t('admin.teams.cancel')}
        confirmLoading={toggling}
        onConfirm={() => void onConfirmToggle()}
      >
        {toggleTarget?.isActive ? t('admin.teams.deactivateBody') : t('admin.teams.activateBody')}
      </Dialog>

      <Modal
        open={membersTeam !== null}
        onClose={() => setMembersTeam(null)}
        title={membersTeam ? t('admin.teams.membersTitle', { name: membersTeam.name }) : t('admin.teams.membersFallback')}
        description={t('admin.teams.membersDesc')}
      >
        {membersLoading && <Skeleton lines={3} />}
        {!membersLoading && membersError && (
          <Alert variant="danger" title={t('admin.teams.membersLoadFailed')} onClose={() => setMembersError(null)}>
            {membersError}
          </Alert>
        )}
        {!membersLoading && !membersError && members.length === 0 && (
          <EmptyState
            title={t('admin.teams.noMembers')}
            description={t('admin.teams.noMembersDesc')}
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
                  aria-label={`${t('admin.teams.remove')}: ${m.name}`}
                >
                  {removingId === m.id ? t('common.loading') : t('admin.teams.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Form onSubmit={(e: FormEvent) => void onAddMember(e)}>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label={t('admin.teams.memberUserId')}
              name="member-user-id"
              placeholder={t('admin.teams.memberUserIdPh')}
              value={memberUserId}
              error={memberFieldError}
              onChange={(e) => setMemberUserId(e.target.value)}
            />
            <Button type="submit" loading={memberBusy} disabled={memberBusy}>
              {t('admin.teams.linkSubmit')}
            </Button>
          </div>
          <p className="text-xs text-ink-500">
            {t('admin.teams.membersHint')}
          </p>
        </Form>
      </Modal>

      <Modal
        open={viewTeam !== null}
        onClose={() => {
          setViewTeam(null)
          setViewDetail(null)
        }}
        title={viewDetail?.name ?? viewTeam?.name ?? t('admin.teams.detail.title')}
        description={viewDetail ? t('admin.teams.detail.reference', { id: viewDetail.id }) : undefined}
        size="lg"
      >
        {viewLoading && <Skeleton lines={5} />}
        {!viewLoading && viewDetail && (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.teams.detail.type')}</dt>
                <dd className="mt-0.5">
                  <Badge variant="secondary">{viewDetail.teamType}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.teams.detail.status')}</dt>
                <dd className="mt-0.5">
                  <Badge variant={statusVariant(viewDetail.isActive)} dot>
                    {viewDetail.isActive ? t('admin.teams.active') : t('admin.teams.inactive')}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.teams.detail.phone')}</dt>
                <dd className="mt-0.5 text-ink-900">
                  {viewDetail.phone ? (
                    <>
                      <span className="block break-words">{viewDetail.phone}</span>
                      <a
                        href={buildTelHref(viewDetail.phone)}
                        className="mt-0.5 inline-block text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                        aria-label={`${t('admin.teams.call')}: ${viewDetail.name}`}
                      >
                        {t('admin.teams.call')}
                      </a>
                    </>
                  ) : (
                    <span className="text-ink-400">{t('admin.teams.noPhone')}</span>
                  )}
                </dd>
              </div>
              {viewDetail.email && (
                <div>
                  <dt className="font-semibold text-ink-500">{t('admin.teams.detail.email')}</dt>
                  <dd className="mt-0.5 break-words text-ink-900">{viewDetail.email}</dd>
                </div>
              )}
              {viewDetail.specializations.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ink-500">{t('admin.teams.detail.specializations')}</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {viewDetail.specializations.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.teams.detail.members')}</dt>
                <dd className="mt-0.5 text-ink-900">
                  {t('admin.teams.memberCount', { count: viewDetail.members.length })}
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
                {t('admin.teams.detail.location')}
              </p>
              {!viewDetail.location ? (
                <p className="text-sm text-ink-500">{t('admin.teams.detail.noLocation')}</p>
              ) : (
                <dl className="grid gap-3 rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-sm sm:grid-cols-2">
                  {viewDetail.location.address && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-ink-500">{t('admin.teams.detail.address')}</dt>
                      <dd className="mt-0.5 break-words text-ink-900">{viewDetail.location.address}</dd>
                    </div>
                  )}
                  {(() => {
                    const area = [viewDetail.location.city, viewDetail.location.state, viewDetail.location.country]
                      .filter(Boolean)
                      .join(', ')
                    return area !== '' ? (
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-ink-500">{t('admin.teams.detail.area')}</dt>
                        <dd className="mt-0.5 text-ink-900">{area}</dd>
                      </div>
                    ) : null
                  })()}
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.teams.detail.coordinates')}</dt>
                    <dd className="mt-0.5 text-ink-900">
                      {viewDetail.location.latitude.toFixed(6)}, {viewDetail.location.longitude.toFixed(6)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-500">{t('admin.teams.detail.accuracy')}</dt>
                    <dd className="mt-0.5 text-ink-900">
                      {viewDetail.location.accuracy !== undefined ? `±${Math.round(viewDetail.location.accuracy)} m` : '—'}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.teams.detail.created')}</dt>
                <dd className="mt-0.5 text-ink-900">{new Date(viewDetail.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-500">{t('admin.teams.detail.updated')}</dt>
                <dd className="mt-0.5 text-ink-900">{new Date(viewDetail.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
