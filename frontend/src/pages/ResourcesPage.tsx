import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { FACILITY_TYPES, TEAM_TYPES, formatCoords, type Facility, type RescueTeam } from '../lib/resources'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { BuildingIcon, MapPinIcon, PhoneIcon, UsersIcon } from '../components/ui/icons'

function useResourceList<T>(path: string, key: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(
    async (query: string, signal?: AbortSignal) => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await api<Record<string, T[]>>(`${path}${query}`, signal ? { signal } : {})
        setItems(res[key] ?? [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setLoadError(err instanceof ApiError ? err.message : 'Could not load resources.')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [path, key],
  )

  return { items, loading, loadError, load }
}

export function ResourcesPage() {
  const {
    items: facilityItems,
    loading: facilitiesLoading,
    loadError: facilitiesError,
    load: loadFacilities,
  } = useResourceList<Facility>('/facilities', 'facilities')
  const {
    items: teamItems,
    loading: teamsLoading,
    loadError: teamsError,
    load: loadTeams,
  } = useResourceList<RescueTeam>('/rescue-teams', 'teams')
  const [facilityType, setFacilityType] = useState('')
  const [facilitySearch, setFacilitySearch] = useState('')
  const [teamType, setTeamType] = useState('')
  const [teamSearch, setTeamSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await Promise.all([loadFacilities('', controller.signal), loadTeams('', controller.signal)])
    }
    void initialLoad()
    return () => controller.abort()
  }, [loadFacilities, loadTeams])

  function applyFacilityFilters(): void {
    const params = new URLSearchParams()
    if (facilityType) params.set('facilityType', facilityType)
    if (facilitySearch.trim()) params.set('search', facilitySearch.trim())
    const q = params.toString()
    void loadFacilities(q ? `?${q}` : '')
  }

  function applyTeamFilters(): void {
    const params = new URLSearchParams()
    if (teamType) params.set('teamType', teamType)
    if (teamSearch.trim()) params.set('search', teamSearch.trim())
    const q = params.toString()
    void loadTeams(q ? `?${q}` : '')
  }

  function resetFacilities(): void {
    setFacilityType('')
    setFacilitySearch('')
    void loadFacilities('')
  }

  function resetTeams(): void {
    setTeamType('')
    setTeamSearch('')
    void loadTeams('')
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Card>
        <CardHeader
          title="Emergency facilities"
          description="Hospitals, shelters, stations and relief centres currently marked operational. Stored information only — not live availability."
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder="Search facilities…"
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                onClear={() => setFacilitySearch('')}
              />
            </div>
            <div className="flex gap-2">
              <Select
                aria-label="Filter by facility type"
                className="w-40"
                value={facilityType}
                onChange={(e) => {
                  setFacilityType(e.target.value)
                  const params = new URLSearchParams()
                  if (e.target.value) params.set('facilityType', e.target.value)
                  if (facilitySearch.trim()) params.set('search', facilitySearch.trim())
                  const q = params.toString()
                  void loadFacilities(q ? `?${q}` : '')
                }}
                options={[{ label: 'All types', value: '' }, ...FACILITY_TYPES.map((t) => ({ label: t, value: t }))]}
              />
              <button
                type="button"
                onClick={applyFacilityFilters}
                className="h-11 shrink-0 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
              >
                Search
              </button>
              {(facilityType !== '' || facilitySearch !== '') && (
                <button
                  type="button"
                  onClick={resetFacilities}
                  className="h-11 shrink-0 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          {facilitiesLoading && <Skeleton lines={4} />}
          {!facilitiesLoading && facilitiesError && (
            <ErrorState title="Could not load facilities" description={facilitiesError} onRetry={() => void loadFacilities('')} />
          )}
          {!facilitiesLoading && !facilitiesError && facilityItems.length === 0 && (
            <EmptyState title="No facilities found" description="Try a different search, or check back later." />
          )}
          {!facilitiesLoading && !facilitiesError && facilityItems.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {facilityItems.map((f) => (
                <li key={f.id} className="flex flex-col gap-2 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink-900">{f.name}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-400">{f.facilityType}</p>
                    </div>
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                      <BuildingIcon className="size-5" />
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                    <PhoneIcon className="size-4 text-ink-400" /> {f.phone}
                  </p>
                  {f.location && (
                    <p className="flex items-center gap-1.5 text-sm text-ink-500">
                      <MapPinIcon className="size-4 shrink-0 text-ink-400" />
                      {formatCoords(f.location.latitude, f.location.longitude, f.location.accuracy)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {f.capacity !== undefined && <Badge variant="neutral">Capacity {f.capacity}</Badge>}
                    {f.operatingHours && <Badge variant="outline">{f.operatingHours}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Rescue teams"
          description="Registered response teams currently marked active. Registration records only — not a guarantee of physical response."
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder="Search teams…"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                onClear={() => setTeamSearch('')}
              />
            </div>
            <div className="flex gap-2">
              <Select
                aria-label="Filter by team type"
                className="w-40"
                value={teamType}
                onChange={(e) => {
                  setTeamType(e.target.value)
                  const params = new URLSearchParams()
                  if (e.target.value) params.set('teamType', e.target.value)
                  if (teamSearch.trim()) params.set('search', teamSearch.trim())
                  const q = params.toString()
                  void loadTeams(q ? `?${q}` : '')
                }}
                options={[{ label: 'All types', value: '' }, ...TEAM_TYPES.map((t) => ({ label: t, value: t }))]}
              />
              <button
                type="button"
                onClick={applyTeamFilters}
                className="h-11 shrink-0 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
              >
                Search
              </button>
              {(teamType !== '' || teamSearch !== '') && (
                <button
                  type="button"
                  onClick={resetTeams}
                  className="h-11 shrink-0 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          {teamsLoading && <Skeleton lines={3} />}
          {!teamsLoading && teamsError && (
            <ErrorState title="Could not load teams" description={teamsError} onRetry={() => void loadTeams('')} />
          )}
          {!teamsLoading && !teamsError && teamItems.length === 0 && (
            <EmptyState title="No teams found" description="Try a different search, or check back later." />
          )}
          {!teamsLoading && !teamsError && teamItems.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamItems.map((t) => (
                <li key={t.id} className="flex flex-col gap-2 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink-900">{t.name}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-400">{t.teamType}</p>
                    </div>
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                      <UsersIcon className="size-5" />
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                    <PhoneIcon className="size-4 text-ink-400" /> {t.phone}
                  </p>
                  {t.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.specializations.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Alert variant="info" title="About these records">
            Facilities and teams are stored information maintained by administrators. Availability,
            beds, response and arrival times are never guaranteed by this app.
          </Alert>
        </CardBody>
      </Card>
    </div>
  )
}
