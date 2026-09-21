import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { requestDeviceLocation, type LocationOutcome } from '../lib/geolocation'
import {
  FACILITY_TYPES,
  TEAM_TYPES,
  formatCoords,
  getOsmNearby,
  buildTelHref,
  buildDirectionsUrl,
  type Facility,
  type NearbyResource,
  type RescueTeam,
} from '../lib/resources'
import { NearbyResourcesSection } from '../components/resources/NearbyResourcesSection'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { SearchInput } from '../components/ui/SearchInput'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import {
  BuildingIcon,
  MapPinIcon,
  PhoneIcon,
  UsersIcon,
  ExternalLinkIcon,
} from '../components/ui/icons'

function gpsErrorKey(outcome: LocationOutcome): string {
  switch (outcome.state) {
    case 'denied':
      return 'nearby.denied'
    case 'timeout':
      return 'nearby.timeout'
    case 'unavailable':
      return 'nearby.unavailable'
    case 'unsupported':
      return 'nearby.unsupported'
    default:
      return 'nearby.invalid'
  }
}

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
  const { t } = useI18n()
  const [acquiring, setAcquiring] = useState(false)
  const [gpsOutcome, setGpsOutcome] = useState<LocationOutcome | null>(null)
  const [osmFacilities, setOsmFacilities] = useState<NearbyResource[]>([])
  const [osmLoading, setOsmLoading] = useState(false)
  const [osmError, setOsmError] = useState<string | null>(null)
  // /api/nearby searches progressively (1 → 2.5 → 5 km); this value only
  // feeds the honest empty-state copy when even 5 km finds nothing.
  const osmSearchRadiusKm = 5

  const loadOsmNearby = useCallback(
    async (latitude: number, longitude: number, signal?: AbortSignal) => {
      setOsmLoading(true)
      setOsmError(null)
      try {
        const res = await getOsmNearby(latitude, longitude, undefined, signal)
        if (!signal?.aborted) setOsmFacilities(res.facilities)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!signal?.aborted) {
          setOsmFacilities([])
          setOsmError(err instanceof ApiError ? err.message : t('nearby.loadError'))
        }
      } finally {
        if (!signal?.aborted) setOsmLoading(false)
      }
    },
    [t],
  )

  async function acquireGps(): Promise<void> {
    setAcquiring(true)
    setGpsOutcome(null)
    try {
      const result = await requestDeviceLocation()
      setGpsOutcome(result)
      if (result.state === 'available') {
        await loadOsmNearby(result.coords.latitude, result.coords.longitude)
      }
    } finally {
      setAcquiring(false)
    }
  }

  function clearGps(): void {
    setGpsOutcome(null)
    setOsmFacilities([])
    setOsmError(null)
  }

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
      {/* SECTION 1: NEARBY EMERGENCY FACILITIES (OSM/Overpass - GPS-based) */}
      <Card>
        <CardHeader
          title={t('resources.nearbyFacilities.title')}
          description={t('resources.nearbyFacilities.description')}
        />
        <CardBody>
          <div className="space-y-4">
            {!gpsOutcome && !acquiring && (
              <Button onClick={() => void acquireGps()}>{t('nearby.useMyLocation')}</Button>
            )}
            {acquiring && (
              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <Spinner size="md" />
                <p className="text-sm text-sky-900">{t('nearby.locating')}</p>
              </div>
            )}
            {gpsOutcome && !acquiring && gpsOutcome.state !== 'available' && (
              <div className="space-y-3">
                <Alert variant="warning" title={t('nearby.title')}>
                  {t(gpsErrorKey(gpsOutcome) as 'nearby.denied')}
                </Alert>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => void acquireGps()}>
                    {t('nearby.retry')}
                  </Button>
                </div>
              </div>
            )}
            {gpsOutcome && !acquiring && gpsOutcome.state === 'available' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-ink-700">
                    <span className="font-bold">{t('nearby.yourLocation')}: </span>
                    {gpsOutcome.coords.latitude.toFixed(6)}, {gpsOutcome.coords.longitude.toFixed(6)}
                    {gpsOutcome.coords.accuracy !== undefined &&
                      ` (±${Math.round(gpsOutcome.coords.accuracy)} m)`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={osmLoading}
                    onClick={() => void loadOsmNearby(gpsOutcome.coords.latitude, gpsOutcome.coords.longitude)}
                  >
                    {t('nearby.refresh')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearGps}>
                    {t('nearby.clearLocation')}
                  </Button>
                </div>
                <NearbyResourcesSection
                  resources={osmFacilities}
                  loading={osmLoading}
                  loadError={osmError}
                  onRetry={() =>
                    void loadOsmNearby(gpsOutcome.coords.latitude, gpsOutcome.coords.longitude)
                  }
                  radiusKm={osmSearchRadiusKm}
                  grouped
                  emptyText={t('resources.nearbyFacilities.empty')}
                />
                <p className="text-xs text-ink-400">{t('map.attribution')}</p>
              </div>
            )}
            {!gpsOutcome && !acquiring && (
              <Alert variant="info" title={t('nearby.title')}>
                {t('resources.nearbyFacilities.gpsRequired')}
              </Alert>
            )}
          </div>
        </CardBody>
      </Card>

      {/* SECTION 2: REGISTERED RESCUE TEAMS (MongoDB RescueTeam collection only) */}
      <Card>
        <CardHeader
          title={t('resources.registeredTeams.title')}
          description={t('resources.registeredTeams.description')}
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder={t('resources.registeredTeams.searchPlaceholder')}
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                onClear={() => setTeamSearch('')}
              />
            </div>
            <div className="flex gap-2">
              <Select
                aria-label={t('resources.registeredTeams.filterAria')}
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
                options={[{ label: t('resources.registeredTeams.allTypes'), value: '' }, ...TEAM_TYPES.map((t) => ({ label: t, value: t }))]}
              />
              <button
                type="button"
                onClick={applyTeamFilters}
                className="h-11 shrink-0 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
              >
                {t('resources.registeredTeams.search')}
              </button>
              {(teamType !== '' || teamSearch !== '') && (
                <button
                  type="button"
                  onClick={resetTeams}
                  className="h-11 shrink-0 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                >
                  {t('resources.registeredTeams.reset')}
                </button>
              )}
            </div>
          </div>
          {teamsLoading && <Skeleton lines={3} />}
          {!teamsLoading && teamsError && (
            <ErrorState title={t('resources.registeredTeams.errorTitle')} description={teamsError} onRetry={() => void loadTeams('')} />
          )}
          {!teamsLoading && !teamsError && teamItems.length === 0 && (
            <EmptyState title={t('resources.registeredTeams.emptyTitle')} description={t('resources.registeredTeams.emptyDescription')} />
          )}
          {!teamsLoading && !teamsError && teamItems.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamItems.map((team) => {
                const mapsUrl = team.location
                  ? buildDirectionsUrl(team.location.latitude, team.location.longitude)
                  : null
                const cityLine = team.location
                  ? [team.location.city, team.location.state, team.location.country].filter(Boolean).join(', ')
                  : ''
                return (
                  <li key={team.id} className="flex flex-col gap-3 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-base font-bold text-ink-900">{team.name}</p>
                        <Badge variant="secondary" className="mt-1.5">{team.teamType}</Badge>
                      </div>
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700" aria-hidden="true">
                        <UsersIcon className="size-5" />
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                      <PhoneIcon className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                      {team.phone ? (
                        <span className="break-words">{team.phone}</span>
                      ) : (
                        <span className="font-normal text-ink-400">{t('resources.registeredTeams.phoneNotAvailable')}</span>
                      )}
                    </p>
                    <div className="space-y-1.5 border-t border-ink-100 pt-3">
                      <p className="flex items-start gap-1.5 text-sm text-ink-600">
                        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="font-semibold">{t('resources.registeredTeams.registeredLocation')}</span>
                          {!team.location ? (
                            <span className="text-ink-400">{t('resources.registeredTeams.locationNotAvailable')}</span>
                          ) : team.location.address ? (
                            <span className="break-words">{team.location.address}</span>
                          ) : cityLine !== '' ? (
                            <span className="break-words">{cityLine}</span>
                          ) : (
                            <span className="text-ink-500">{t('resources.registeredTeams.locationOnMap')}</span>
                          )}
                          {team.location && (
                            <span className="text-xs text-ink-400">
                              {formatCoords(team.location.latitude, team.location.longitude, team.location.accuracy)}
                            </span>
                          )}
                        </span>
                      </p>
                    </div>
                    <div className="mt-auto flex flex-col gap-2 pt-1">
                      {team.phone ? (
                        <a
                          href={buildTelHref(team.phone)}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
                          aria-label={t('resources.registeredTeams.callTeamAria', { name: team.name })}
                        >
                          <PhoneIcon className="size-4" aria-hidden="true" />
                          {t('resources.registeredTeams.callTeam')}
                        </a>
                      ) : null}
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                          aria-label={t('resources.registeredTeams.viewLocationAria', { name: team.name })}
                        >
                          <ExternalLinkIcon className="size-4" aria-hidden="true" />
                          {t('resources.registeredTeams.viewLocation')}
                        </a>
                      ) : null}
                    </div>
                    {team.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {team.specializations.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <Alert variant="info" title={t('resources.registeredTeams.aboutTitle')}>
            {t('resources.registeredTeams.aboutBody')}
          </Alert>
        </CardBody>
      </Card>

      {/* SECTION 3: STORED EMERGENCY FACILITIES (MongoDB Facility collection - admin managed) */}
      <Card>
        <CardHeader
          title={t('resources.storedFacilities.title')}
          description={t('resources.storedFacilities.description')}
        />
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder={t('resources.storedFacilities.searchPlaceholder')}
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                onClear={() => setFacilitySearch('')}
              />
            </div>
            <div className="flex gap-2">
              <Select
                aria-label={t('resources.storedFacilities.filterAria')}
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
                options={[{ label: t('resources.storedFacilities.allTypes'), value: '' }, ...FACILITY_TYPES.map((t) => ({ label: t, value: t }))]}
              />
              <button
                type="button"
                onClick={applyFacilityFilters}
                className="h-11 shrink-0 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
              >
                {t('resources.storedFacilities.search')}
              </button>
              {(facilityType !== '' || facilitySearch !== '') && (
                <button
                  type="button"
                  onClick={resetFacilities}
                  className="h-11 shrink-0 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                >
                  {t('resources.storedFacilities.reset')}
                </button>
              )}
            </div>
          </div>
          {facilitiesLoading && <Skeleton lines={4} />}
          {!facilitiesLoading && facilitiesError && (
            <ErrorState title={t('resources.storedFacilities.errorTitle')} description={facilitiesError} onRetry={() => void loadFacilities('')} />
          )}
          {!facilitiesLoading && !facilitiesError && facilityItems.length === 0 && (
            <EmptyState title={t('resources.storedFacilities.emptyTitle')} description={t('resources.storedFacilities.emptyDescription')} />
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
          <Alert variant="info" title={t('resources.storedFacilities.aboutTitle')}>
            {t('resources.storedFacilities.aboutBody')}
          </Alert>
        </CardBody>
      </Card>
    </div>
  )
}