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
import { PhoneIcon } from '../components/ui/icons'

const ACTIVE_STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS']

interface Helpline {
  nameKey: string
  descriptionKey: string
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

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Card className="border-rose-200 bg-rose-50/50">
        <CardBody className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <PhoneIcon className="size-5 text-rose-700" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-rose-700">{t('dashboard.helplines.title')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" role="list" aria-label="Emergency helpline numbers">
            {HELPLINES.map((hl) => (
              <a
                key={hl.number}
                href={`tel:${hl.number}`}
                className="flex flex-col gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-left shadow-sm hover:bg-rose-50 transition-colors"
                role="listitem"
                aria-label={t('dashboard.helplines.call', { name: t(hl.nameKey as DictKey), number: hl.number })}
              >
                <p className="truncate text-xs font-extrabold text-ink-900" title={t(hl.nameKey as DictKey)}>
                  {t(hl.nameKey as DictKey)}
                </p>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-lg font-extrabold text-rose-700">{hl.number}</span>
                  <Button size="sm" variant="secondary" className="shrink-0" aria-label={t('dashboard.helplines.call', { name: t(hl.nameKey as DictKey) })}>
                    {t('dashboard.helplines.call')}
                  </Button>
                </span>
                <p className="truncate text-[10px] text-ink-400" title={t(hl.descriptionKey as DictKey)}>
                  {t(hl.descriptionKey as DictKey)}
                </p>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex flex-col items-center gap-5 py-2 text-center sm:flex-row sm:text-left">
            <a href="#/sos" aria-label={t('nav.sos')}>
              <SosButton size="lg" />
            </a>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">
                {user ? t('dashboard.welcome.user', { name: user.name.split(' ')[0] }) : t('dashboard.welcome.guest')}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{t('dashboard.subtitle')}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <a href="#/sos">
                  <Button variant="primary">{t('dashboard.action.sos')}</Button>
                </a>
                <a href="#/contacts">
                  <Button variant="outline">{t('dashboard.action.contacts')}</Button>
                </a>
                <a href="#/report-unsafe">
                  <Button variant="outline">{t('dashboard.action.reportUnsafe')}</Button>
                </a>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3">
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-ink-900">{loading ? '–' : incidents.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t('dashboard.stat.total')}</p>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-gold-700">{loading ? '–' : activeCount}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t('dashboard.stat.active')}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('dashboard.incidents.title')}
          description={t('dashboard.incidents.description')}
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
            <div className="space-y-2" aria-label={t('common.loading')}>
              <Skeleton lines={4} />
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
            <ul className="space-y-3">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-col gap-2 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
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
                    className="shrink-0 text-sm font-semibold text-gold-700 hover:text-gold-800 sm:self-center"
                  >
                    {t('dashboard.incidents.viewDetails')}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {!loading && !loadError && incidents.length > 0 && (
            <Alert variant="info" title={t('dashboard.alert.response.title')}>
              {t('dashboard.alert.response.body')}
            </Alert>
          )}
        </CardBody>
      </Card>
    </div>
  )
}