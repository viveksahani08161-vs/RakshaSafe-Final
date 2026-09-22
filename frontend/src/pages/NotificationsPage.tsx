import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useI18n } from '../lib/i18n'
import {
  channelBadgeVariant,
  eventLabel,
  getLastSeen,
  isUnread,
  notificationStatusVariant,
  setLastSeen,
  type NotificationItem,
} from '../lib/notifications'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { BellIcon } from '../components/ui/icons'

function formatDateTime(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export function NotificationsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [cursorUser, setCursorUser] = useState<string | null>(() => user?.id ?? null)
  const [cursor, setCursor] = useState<string | null>(() => (user ? getLastSeen(user.id) : null))
  // Render-phase sync: re-read the cursor when the signed-in account changes.
  if ((user?.id ?? null) !== cursorUser) {
    setCursorUser(user?.id ?? null)
    setCursor(user ? getLastSeen(user.id) : null)
  }
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api<{ notifications: NotificationItem[] }>(
        '/notifications',
        signal ? { signal } : {},
      )
      setItems(res.notifications)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError(err instanceof ApiError ? err.message : t('notifications.errorTitle'))
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

  function markAllRead(): void {
    if (!user) return
    setLastSeen(user.id)
    setCursor(getLastSeen(user.id))
  }

  const unreadCount = items.filter((n) => isUnread(n, cursor)).length

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Card>
        <CardHeader
          title={t('notifications.title')}
          description={t('notifications.description')}
          action={
            !loading && !loadError && unreadCount > 0 ? (
              <Button size="sm" variant="outline" onClick={markAllRead}>
                {t('notifications.markAllRead')}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {loading && (
            <div className="space-y-2" aria-label={t('notifications.loading')}>
              <Skeleton lines={4} />
            </div>
          )}
          {!loading && loadError && (
            <ErrorState title={t('notifications.errorTitle')} description={loadError} onRetry={() => void load()} />
          )}
          {!loading && !loadError && items.length === 0 && (
            <EmptyState
              title={t('notifications.emptyTitle')}
              description={t('notifications.emptyDescription')}
            />
          )}
          {!loading && !loadError && items.length > 0 && (
            <ul className="space-y-3">
              {items.map((n) => {
                const unread = isUnread(n, cursor)
                return (
                  <li
                    key={n.id}
                    className={
                      unread
                        ? 'rounded-2xl border border-gold-300 bg-gold-50/60 p-4 shadow-sm dark:border-gold-500/30 dark:bg-gold-500/10'
                        : 'rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5'
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={unread ? 'mt-1.5 size-2.5 shrink-0 rounded-full bg-gold-500' : 'mt-1.5 size-2.5 shrink-0 rounded-full bg-ink-200'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-900">
                            <BellIcon className="size-4 text-gold-600" />
                            {eventLabel(n)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-500">
                          {n.channel === 'In-App'
                            ? t('notifications.inApp')
                            : t('notifications.channelTo', { channel: n.channel, contactName: n.contactName ?? '' }).trim()}
                          {n.incident && (
                            <>
                              {' '}·{' '}
                              <a
                                href={`#/incident/${n.incident.id}`}
                                className="font-semibold text-gold-700 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200"
                              >
                                {n.incident.category}
                              </a>
                            </>
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={channelBadgeVariant(n.channel)}>{n.channel}</Badge>
                          <Badge variant={notificationStatusVariant(n.status)} dot>
                            {n.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-ink-400">{formatDateTime(n.createdAt)}</span>
                        </div>
                        {n.status === 'NOT_CONFIGURED' && (
                          <p className="mt-1 text-xs text-ink-400">
                            {t('notifications.notConfigured', { channel: n.channel })}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {!loading && !loadError && items.length > 0 && (
            <Alert variant="info" title={t('notifications.aboutDelivery.title')}>
              {t('notifications.aboutDelivery.body')}
            </Alert>
          )}
        </CardBody>
      </Card>
    </div>
  )
}