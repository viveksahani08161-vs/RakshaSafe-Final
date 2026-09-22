import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useI18n, type DictKey } from '../lib/i18n'
import {
  assignmentBadgeVariant,
  formatDateTime,
  nextActionsFor,
  type ResponderAssignment,
} from '../lib/responder'
import { useToast } from '../components/ui/toast-context'
import { HistoryTimeline, type HistoryEntry } from '../components/incidents/HistoryTimeline'
import {
  channelBadgeVariant,
  eventLabel,
  notificationStatusVariant,
  type NotificationItem,
} from '../lib/notifications'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { BellIcon, MapPinIcon, PhoneIcon } from '../components/ui/icons'

interface ResponderDetail {
  location: { latitude: number; longitude: number; accuracy?: number } | null
  reporter: { name: string; phone: string } | null
  updates: HistoryEntry[]
}

export function ResponderDashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { notify } = useToast()
  const [items, setItems] = useState<ResponderAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [rowError, setRowError] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, ResponderDetail>>({})
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({})
  const [detailError, setDetailError] = useState<Record<string, string>>({})
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [notifsLoading, setNotifsLoading] = useState(true)
  const [notifsError, setNotifsError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api<{ assignments: ResponderAssignment[] }>(
        '/responder/assignments',
        signal ? { signal } : {},
      )
      setItems(res.assignments)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError(err instanceof ApiError ? err.message : t('responder.loadError.assignments'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  const loadNotifs = useCallback(async (signal?: AbortSignal) => {
    setNotifsLoading(true)
    setNotifsError(null)
    try {
      const res = await api<{ notifications: NotificationItem[] }>(
        '/responder/notifications',
        signal ? { signal } : {},
      )
      setNotifs(res.notifications)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setNotifsError(err instanceof ApiError ? err.message : t('responder.loadError.notifications'))
    } finally {
      if (!signal?.aborted) setNotifsLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    void loadNotifs(controller.signal)
    return () => controller.abort()
  }, [load, loadNotifs])

  function scrollToAssignment(assignmentId: string): void {
    document
      .getElementById(`assignment-${assignmentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function updateStatus(a: ResponderAssignment, next: string): Promise<void> {
    setSaving((prev) => ({ ...prev, [a.id]: true }))
    setRowError((prev) => {
      const copy = { ...prev }
      delete copy[a.id]
      return copy
    })
    try {
      await api(`/responder/assignments/${a.id}`, { method: 'PATCH', body: { status: next } })
      notify({ title: t('responder.notification.assignmentUpdated'), description: t('responder.notification.updatedDescription', { status: next }), variant: 'success' })
      await load()
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [a.id]: err instanceof ApiError ? err.message : t('responder.updateError'),
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [a.id]: false }))
    }
  }

  async function loadDetails(a: ResponderAssignment): Promise<void> {
    if (details[a.id] || detailLoading[a.id]) return
    setDetailLoading((prev) => ({ ...prev, [a.id]: true }))
    setDetailError((prev) => {
      const copy = { ...prev }
      delete copy[a.id]
      return copy
    })
    try {
      const res = await api<{
        location: ResponderDetail['location']
        reporter: ResponderDetail['reporter']
        updates: HistoryEntry[]
      }>(`/responder/incidents/${a.incidentId}`)
      setDetails((prev) => ({
        ...prev,
        [a.id]: { location: res.location, reporter: res.reporter, updates: res.updates },
      }))
    } catch (err) {
      setDetailError((prev) => ({
        ...prev,
        [a.id]: err instanceof ApiError ? err.message : t('responder.loadError.details'),
      }))
    } finally {
      setDetailLoading((prev) => ({ ...prev, [a.id]: false }))
    }
  }

  function toggleDetails(a: ResponderAssignment): void {
    if (openId === a.id) {
      setOpenId(null)
      return
    }
    setOpenId(a.id)
    void loadDetails(a)
  }

  const activeCount = items.filter((a) =>
    ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE'].includes(a.status),
  ).length

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Card>
        <CardBody>
          <div className="flex flex-col gap-2 py-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">
              {user ? t('responder.title', { name: user.name.split(' ')[0] }) : t('responder.title.guest')}
            </h1>
            <p className="text-sm leading-relaxed text-ink-500">
              {t('responder.subtitle')}
            </p>
            <div className="grid shrink-0 grid-cols-2 gap-3 sm:max-w-xs">
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-ink-900">{loading ? '–' : items.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t('responder.stat.assigned')}</p>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-gold-700 dark:text-gold-300">{loading ? '–' : activeCount}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{t('responder.stat.active')}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('responder.notifications.title')}
          description={t('responder.notifications.description')}
          action={
            !notifsLoading && !notifsError && notifs.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => void loadNotifs()}>
                {t('responder.notifications.refresh')}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {notifsLoading && (
            <div className="space-y-2" aria-label={t('notifications.loading')}>
              <Skeleton lines={3} />
            </div>
          )}
          {!notifsLoading && notifsError && (
            <ErrorState
              title={t('responder.notifications.errorTitle')}
              description={notifsError}
              onRetry={() => void loadNotifs()}
            />
          )}
          {!notifsLoading && !notifsError && notifs.length === 0 && (
            <EmptyState
              title={t('responder.notifications.emptyTitle')}
              description={t('responder.notifications.emptyDescription')}
            />
          )}
          {!notifsLoading && !notifsError && notifs.length > 0 && (
            <ul className="space-y-2">
              {notifs.map((n) => {
                const target = items.find((a) => a.incidentId === n.incidentId)
                return (
                  <li
                    key={n.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200/70 bg-white p-3"
                  >
                    <BellIcon className="size-4 shrink-0 text-gold-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-900">{t(eventLabel(n) as DictKey)}</p>
                      <p className="text-xs text-ink-400">
                        {n.incident ? `${n.incident.category} · ${n.incident.status}` : 'Incident update'} ·{' '}
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                    <Badge variant={channelBadgeVariant(n.channel)}>{n.channel}</Badge>
                    <Badge variant={notificationStatusVariant(n.status)} dot>
                      {n.status.replace('_', ' ')}
                    </Badge>
                    {target && (
                      <Button size="sm" variant="outline" onClick={() => scrollToAssignment(target.id)}>
                        {t('responder.notifications.viewAssignment')}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('responder.assignments.title')}
          description={t('responder.assignments.description')}
          action={
            !loading && !loadError && items.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => void load()}>
                {t('responder.assignments.refresh')}
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
              title={t('responder.assignments.errorTitle')}
              description={loadError}
              onRetry={() => void load()}
            />
          )}
          {!loading && !loadError && items.length === 0 && (
            <EmptyState
              title={t('responder.assignments.emptyTitle')}
              description={t('responder.assignments.emptyDescription')}
            />
          )}
          {!loading && !loadError && items.length > 0 && (
            <ul className="space-y-3">
              {items.map((a) => {
                const actions = nextActionsFor(a.status)
                return (
                  <li
                    key={a.id}
                    id={`assignment-${a.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5 scroll-mt-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={assignmentBadgeVariant(a.status)} dot>
                        {a.status}
                      </Badge>
                      {a.team && (
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-400">
                          {a.team.name} · {a.team.teamType}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-ink-400">
                        {t('responder.assignedDate', { date: formatDateTime(a.assignedAt) })}
                      </span>
                    </div>
                    {a.incident ? (
                      <div className="min-w-0 rounded-xl bg-cream-50 p-3">
                        <p className="text-sm font-bold text-ink-900">
                          {a.incident.category}{' '}
                          <span className="font-normal text-ink-400">
                            · {a.incident.type} · {a.incident.priority} · {a.incident.status}
                          </span>
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm text-ink-600">{a.incident.description}</p>
                        <p className="mt-1 text-xs text-ink-400">
                          {t('responder.reportedDate', { date: formatDateTime(a.incident.createdAt) })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-500">{t('responder.incident.unavailable')}</p>
                    )}
                    {a.notes && <p className="text-sm italic text-ink-600">{t('responder.note', { notes: a.notes })}</p>}
                    {actions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {actions.map((act) => (
                          <Button
                            key={act.status}
                            size="sm"
                            variant={act.variant}
                            disabled={saving[a.id] ?? false}
                            onClick={() => void updateStatus(a, act.status)}
                          >
                            {t(act.labelKey as DictKey)}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleDetails(a)}
                        >
                          {openId === a.id ? t('responder.action.hideDetails') : t('responder.action.viewDetails')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-ink-400">
                          {t('responder.status.final', { status: a.status.toLowerCase() })}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleDetails(a)}
                        >
                          {openId === a.id ? t('responder.action.hideDetails') : t('responder.action.viewDetails')}
                        </Button>
                      </div>
                    )}
                    {rowError[a.id] && (
                      <p className="text-xs font-medium text-rose-600" role="alert">
                        {rowError[a.id]}
                      </p>
                    )}
                    {openId === a.id && (
                      <div className="rounded-xl border border-ink-200/70 bg-cream-50 p-3">
                        {detailLoading[a.id] && (
                          <div aria-label={t('common.loading')}>
                            <Skeleton lines={2} />
                          </div>
                        )}
                        {!detailLoading[a.id] && detailError[a.id] && (
                          <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
                            {detailError[a.id]}{' '}
                            <button
                              type="button"
                              className="font-bold underline"
                              onClick={() => void loadDetails(a)}
                            >
                              {t('responder.retry')}
                            </button>
                          </p>
                        )}
                        {!detailLoading[a.id] && !detailError[a.id] && details[a.id] && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                                {t('responder.detail.location')}
                              </p>
                              {details[a.id].location ? (
                                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-800">
                                  <MapPinIcon className="size-4 shrink-0 text-ink-400" />
                                  {details[a.id].location!.latitude.toFixed(6)},{' '}
                                  {details[a.id].location!.longitude.toFixed(6)}
                                  {details[a.id].location!.accuracy !== undefined &&
                                    ` (±${Math.round(details[a.id].location!.accuracy as number)} m)`}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-sm text-ink-500">
                                  {t('responder.detail.noLocation')}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                                {t('responder.detail.reporter')}
                              </p>
                              {details[a.id].reporter ? (
                                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-800">
                                  <PhoneIcon className="size-4 shrink-0 text-ink-400" />
                                  {details[a.id].reporter!.name} · {details[a.id].reporter!.phone}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-sm text-ink-500">
                                  {t('responder.detail.noReporter')}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                                {t('responder.detail.history')}
                              </p>
                              <div className="mt-1">
                                {details[a.id].updates.length === 0 ? (
                                  <p className="text-sm text-ink-500">{t('responder.detail.noHistory')}</p>
                                ) : (
                                  <HistoryTimeline entries={details[a.id].updates} />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {a.team && (
                      <p className="flex items-center gap-1.5 text-xs text-ink-400">
                        <PhoneIcon className="size-3.5" /> {t('responder.teamContact', { phone: a.team.phone })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {!loading && !loadError && items.length > 0 && (
            <Alert variant="info" title={t('responder.alert.respondHonestly')}>
              {t('responder.alert.respondHonestly')}
            </Alert>
          )}
        </CardBody>
      </Card>
    </div>
  )
}