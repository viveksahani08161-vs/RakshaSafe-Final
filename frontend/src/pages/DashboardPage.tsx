import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { formatDateTime, statusBadgeVariant, type Incident } from '../lib/incidents'
import { useI18n, type DictKey } from '../lib/i18n'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { SosButton } from '../components/ui/SosButton'
import { UsersIcon, MapPinIcon, AlertTriangleIcon, ShieldCheckIcon, InfoIcon, ChevronRightIcon } from '../components/ui/icons'

const ACTIVE_STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS']

interface Helpline {
  nameKey: DictKey
  descriptionKey: DictKey
  number: string
}

const HELPLINES: Helpline[] = [
  { nameKey: 'dashboard.helpline.nationalEmergency.name', descriptionKey: 'dashboard.helpline.nationalEmergency.description', number: '112' },
  { nameKey: 'dashboard.helpline.police.name', descriptionKey: 'dashboard.helpline.police.description', number: '100' },
  { nameKey: 'dashboard.helpline.fire.name', descriptionKey: 'dashboard.helpline.fire.description', number: '101' },
  { nameKey: 'dashboard.helpline.ambulance.name', descriptionKey: 'dashboard.helpline.ambulance.description', number: '108' },
  { nameKey: 'dashboard.helpline.women.name', descriptionKey: 'dashboard.helpline.women.description', number: '181' },
  { nameKey: 'dashboard.helpline.child.name', descriptionKey: 'dashboard.helpline.child.description', number: '1098' },
  { nameKey: 'dashboard.helpline.cyber.name', descriptionKey: 'dashboard.helpline.cyber.description', number: '1930' },
]

interface QuickAction {
  titleKey: DictKey
  descriptionKey: DictKey
  href: string
  icon: React.ReactNode
}

export function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
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

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  const activeCount = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status)).length
  const userName = user?.name?.split(' ')[0] ?? ''

  const quickActions: QuickAction[] = [
    { titleKey: 'dashboard.quickAccess.contacts.title', descriptionKey: 'dashboard.quickAccess.contacts.description', href: '#/contacts', icon: <UsersIcon className="size-6" /> },
    { titleKey: 'dashboard.quickAccess.resources.title', descriptionKey: 'dashboard.quickAccess.resources.description', href: '#/resources', icon: <MapPinIcon className="size-6" /> },
    { titleKey: 'dashboard.quickAccess.reportUnsafe.title', descriptionKey: 'dashboard.quickAccess.reportUnsafe.description', href: '#/report-unsafe', icon: <AlertTriangleIcon className="size-6" /> },
  ]

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 sm:px-6 py-6">
      {/* Emergency Helplines */}
      <Card>
        <CardHeader
          title={t('dashboard.helplines.title')}
          description={t('dashboard.helplines.subtitle')}
        />
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" role="list" aria-label={t('dashboard.helplines.title')}>
            {HELPLINES.map((hl) => (
              <a
                key={hl.number}
                href={`tel:${hl.number}`}
                className="flex flex-col gap-2 rounded-xl border border-ink-200/70 bg-white p-3 shadow-sm hover:bg-cream-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
                role="listitem"
                aria-label={`${t('dashboard.helplines.call')} ${t(hl.nameKey as DictKey)} ${hl.number}`}
              >
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-bold text-ink-900" title={t(hl.nameKey as DictKey)}>
                    {t(hl.nameKey as DictKey)}
                  </p>
                  <span className="shrink-0 font-mono text-lg font-extrabold text-rose-600">{hl.number}</span>
                </div>
                <p className="truncate text-[10px] text-ink-400" title={t(hl.descriptionKey as DictKey)}>
                  {t(hl.descriptionKey as DictKey)}
                </p>
                <Button size="sm" variant="secondary" className="w-full shrink-0" aria-label={`${t('dashboard.helplines.call')} ${t(hl.nameKey as DictKey)}`}>
                  {t('dashboard.helplines.call')}
                </Button>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Welcome / Quick Action Hero */}
      <Card className="bg-gradient-to-br from-cream-50 to-white border-gold-100">
        <CardBody className="py-6 sm:py-8">
          <div className="flex flex-col items-center gap-6 py-2 text-center sm:flex-row sm:text-left">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">
                {user ? t('dashboard.welcome.title', { name: userName }) : t('dashboard.welcome.guest')}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-500 sm:mt-2">{t('dashboard.welcome.subtitle')}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500 max-w-md">{t('dashboard.welcome.description')}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                <a href="#/sos" aria-label={t('nav.sos')}>
                  <SosButton size="lg" className="w-full sm:w-auto" />
                </a>
                <a href="#/contacts">
                  <Button variant="outline" className="w-full sm:w-auto">{t('dashboard.action.contacts')}</Button>
                </a>
                <a href="#/resources">
                  <Button variant="outline" className="w-full sm:w-auto">{t('dashboard.action.resources')}</Button>
                </a>
                <a href="#/report-unsafe">
                  <Button variant="outline" className="w-full sm:w-auto">{t('dashboard.action.reportUnsafe')}</Button>
                </a>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 w-full sm:w-auto">
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-4 text-center">
                <p className="text-3xl font-extrabold text-ink-900">{loading ? '–' : incidents.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t('dashboard.stat.total')}</p>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-4 text-center">
                <p className="text-3xl font-extrabold text-gold-700">{loading ? '–' : activeCount}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t('dashboard.stat.active')}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Safety Status / Quick Summary Cards */}
      <Card>
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-ink-200/70 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink-900">{loading ? '–' : incidents.length}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('dashboard.stat.total')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-ink-200/70 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <AlertTriangleIcon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink-900">{loading ? '–' : activeCount}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('dashboard.stat.active')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-ink-200/70 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <UsersIcon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink-900">—</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('dashboard.stat.contacts')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-ink-200/70 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <MapPinIcon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink-900">—</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('dashboard.stat.resources')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Safety Quick Access */}
      <Card>
        <CardHeader title={t('dashboard.quickAccess.title')} />
        <CardBody className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickActions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex flex-col gap-3 rounded-xl border border-ink-200/70 bg-white p-4 shadow-sm hover:bg-cream-50 hover:border-gold-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  {action.icon}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-ink-900">{t(action.titleKey)}</h3>
                  <p className="mt-1 text-sm text-ink-500">{t(action.descriptionKey)}</p>
                </div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* My Incidents */}
      <Card>
        <CardHeader
          title={t('dashboard.incidents.title')}
          description={t('dashboard.incidents.subtitle')}
          action={
            !loading && !loadError && incidents.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => void load()}>
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
              onRetry={() => void load()}
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
                  className="rounded-xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5 hover:shadow-md transition-shadow"
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
                      className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800 sm:self-center"
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
      <Card className="border-sky-200 bg-sky-50/30">
        <CardBody className="flex items-center gap-3 p-4 sm:p-6">
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
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