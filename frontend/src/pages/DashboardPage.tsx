import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { formatDateTime, statusBadgeVariant, type Incident } from '../lib/incidents'
import { useI18n, type DictKey } from '../lib/i18n'
import { requestDeviceLocation, type LocationOutcome } from '../lib/geolocation'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { SosButton } from '../components/ui/SosButton'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  InfoIcon,
  MapPinIcon,
  UsersIcon,
} from '../components/ui/icons'
import { EmergencyHelplines } from '../components/dashboard/EmergencyHelplines'

const ACTIVE_STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS']

interface ToolTile {
  titleKey: DictKey
  descriptionKey: DictKey
  href: string
  icon: React.ReactNode
}

const TOOL_TILES: ToolTile[] = [
  { titleKey: 'dashboard.quickAccess.contacts.title', descriptionKey: 'dashboard.quickAccess.contacts.description', href: '#/contacts', icon: <UsersIcon className="size-5" /> },
  { titleKey: 'dashboard.quickAccess.resources.title', descriptionKey: 'dashboard.quickAccess.resources.description', href: '#/resources', icon: <MapPinIcon className="size-5" /> },
  { titleKey: 'dashboard.quickAccess.reportUnsafe.title', descriptionKey: 'dashboard.quickAccess.reportUnsafe.description', href: '#/report-unsafe', icon: <AlertTriangleIcon className="size-5" /> },
]

function StatTile({ label, value, icon, accent }: {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5">
      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${accent ?? 'bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-2xl font-extrabold leading-none text-ink-900">{value}</p>
        <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [contacts, setContacts] = useState<{ id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [contactsError, setContactsError] = useState(false)

  const [locationOutcome, setLocationOutcome] = useState<LocationOutcome | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const loadIncidents = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api<{ incidents: Incident[] }>('/incidents', signal ? { signal } : {})
      setIncidents(res.incidents)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError(err instanceof ApiError ? err.message : t('dashboard.incidents.errorTitle'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  const loadContacts = useCallback(async (signal?: AbortSignal) => {
    setContactsLoading(true)
    setContactsError(false)
    try {
      const res = await api<{ contacts: { id: string }[] }>('/emergency-contacts', signal ? { signal } : {})
      if (!signal?.aborted) setContacts(res.contacts)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!signal?.aborted) setContactsError(true)
    } finally {
      if (!signal?.aborted) setContactsLoading(false)
    }
  }, [])

  const loadLocation = useCallback(async () => {
    setLocationLoading(true)
    try {
      const result = await requestDeviceLocation()
      setLocationOutcome(result)
    } finally {
      setLocationLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await Promise.all([
        loadIncidents(controller.signal),
        loadContacts(controller.signal),
      ])
      // Load device location after initial data (non-blocking)
      void loadLocation()
    }
    void initialLoad()
    return () => controller.abort()
  }, [loadIncidents, loadContacts, loadLocation])

  const activeCount = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status)).length
  const contactsCount = contacts.length
  const userName = user?.name?.split(' ')[0] ?? ''

  // Device location status only - never conflated with stored incident locations.
  const getLocationDisplay = (): string => {
    if (locationLoading) return t('dashboard.location.loading')
    if (!locationOutcome) return t('dashboard.location.idle')
    switch (locationOutcome.state) {
      case 'available':
        return t('dashboard.location.available')
      case 'denied':
        return t('dashboard.location.denied')
      case 'timeout':
        return t('dashboard.location.timeout')
      case 'unavailable':
        return t('dashboard.location.unavailable')
      case 'unsupported':
        return t('dashboard.location.unsupported')
    }
  }

  const locationDisplay = getLocationDisplay()

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 sm:px-6 py-6">
      {/* Welcome / Hero */}
      <Card className="overflow-hidden border-gold-100 bg-gradient-to-br from-cream-50 via-white to-sky-50/40 dark:border-gold-500/20 dark:to-sky-900/30">
        <CardBody className="py-6 sm:py-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">
                {user ? t('dashboard.welcome.title', { name: userName }) : t('dashboard.welcome.guest')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-500 sm:max-w-md">{t('dashboard.welcome.subtitle')}</p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <a href="#/sos" aria-label={t('nav.sos')}>
                <SosButton size="lg" />
              </a>
              <p className="text-xs font-medium text-ink-400">{t('dashboard.hero.sosHint')}</p>
            </div>
          </div>

          {/* Secondary safety tools */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3" role="list" aria-label={t('dashboard.quickAccess.title')}>
            {TOOL_TILES.map((tool) => (
              <a
                key={tool.href}
                href={tool.href}
                className="group flex items-center gap-3 rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm shadow-ink-900/5 transition-colors hover:border-gold-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                role="listitem"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700 transition-colors group-hover:bg-gold-100 dark:bg-gold-500/15 dark:text-gold-300 dark:group-hover:bg-gold-500/25">
                  {tool.icon}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold text-ink-900">{t(tool.titleKey)}</span>
                  <span className="block truncate text-xs text-ink-500">{t(tool.descriptionKey)}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-ink-300 transition-colors group-hover:text-gold-600 dark:text-ink-600" />
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Summary statistics */}
      <Card>
        <CardHeader title={t('dashboard.summary.title')} description={t('dashboard.summary.subtitle')} />
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={t('dashboard.stat.total')}
              value={loading ? '–' : incidents.length}
              icon={<ActivityIcon className="size-5" />}
            />
            <StatTile
              label={t('dashboard.stat.active')}
              value={loading ? '–' : activeCount}
              icon={<AlertTriangleIcon className="size-5" />}
              accent="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
            />
            <StatTile
              label={t('dashboard.stat.contacts')}
              value={contactsLoading || contactsError ? '–' : contactsCount}
              icon={<UsersIcon className="size-5" />}
              accent="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
            />
            <StatTile
              label={t('dashboard.stat.location')}
              value={locationDisplay}
              icon={<MapPinIcon className="size-5" />}
              accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            />
          </div>
          {contactsError && (
            <Alert
              variant="warning"
              title={t('contacts.errorTitle')}
              className="mt-3"
              onClose={() => setContactsError(false)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-ink-600">{t('dashboard.stat.contactsErrorBody')}</span>
                <Button size="sm" variant="outline" onClick={() => void loadContacts()}>
                  {t('common.tryAgain')}
                </Button>
              </div>
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Emergency Helplines */}
      <EmergencyHelplines />

      {/* My Incidents */}
      <Card>
        <CardHeader
          title={t('dashboard.incidents.title')}
          description={t('dashboard.incidents.subtitle')}
          action={
            !loading && !loadError && incidents.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => void loadIncidents()}>
                {t('dashboard.incidents.refresh')}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {loading && (
            <div className="space-y-3" aria-label={t('common.loading')}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          )}
          {!loading && loadError && (
            <ErrorState
              title={t('dashboard.incidents.errorTitle')}
              description={loadError}
              onRetry={() => void loadIncidents()}
            />
          )}
          {!loading && !loadError && incidents.length === 0 && (
            <EmptyState
              title={t('dashboard.incidents.emptyTitle')}
              description={t('dashboard.incidents.emptyDescription')}
              action={
                <a href="#/sos">
                  <Button size="sm" variant="primary">
                    {t('dashboard.incidents.raiseFirst')}
                  </Button>
                </a>
              }
            />
          )}
          {!loading && !loadError && incidents.length > 0 && (
            <ul className="space-y-3" role="list">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="rounded-xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusBadgeVariant(incident.status)} dot>
                          {incident.status}
                        </Badge>
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-400">
                          {incident.type} · {incident.priority}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-bold text-ink-900">{incident.category}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{incident.description}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {formatDateTime(incident.createdAt)}
                        {incident.locationId ? ` · ${t('dashboard.incidents.location.yes')}` : ` · ${t('dashboard.incidents.location.no')}`}
                      </p>
                    </div>
                    <a
                      href={`#/incident/${incident.id}`}
                      className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200 sm:self-center"
                    >
                      {t('dashboard.incidents.viewDetails')}
                      <ChevronRightIcon className="size-4" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loading && !loadError && incidents.length > 0 && (
            <Alert variant="info" title={t('dashboard.alert.response.title')} className="mt-4">
              <InfoIcon className="size-4 shrink-0 mr-2" />
              {t('dashboard.alert.response.body')}
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Trust / Information Card */}
      <Card className="border-sky-200 bg-sky-50/30 dark:border-sky-800 dark:bg-sky-500/10">
        <CardBody className="flex items-center gap-3 p-4 sm:p-6">
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <InfoIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-ink-900">{t('dashboard.trust.title')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">{t('dashboard.trust.description')}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}