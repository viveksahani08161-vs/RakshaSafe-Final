import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { formatDateTime, statusBadgeVariant, type Incident } from '../lib/incidents'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { SosButton } from '../components/ui/SosButton'

const ACTIVE_STATUSES = ['REPORTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS']

export function DashboardPage() {
  const { user } = useAuth()
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
      setLoadError(err instanceof ApiError ? err.message : 'Could not load your incidents.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

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
      <Card>
        <CardBody>
          <div className="flex flex-col items-center gap-5 py-2 text-center sm:flex-row sm:text-left">
            <a href="#/sos" aria-label="Go to SOS">
              <SosButton size="lg" />
            </a>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">
                {user ? `Stay safe, ${user.name.split(' ')[0]}` : 'Your safety dashboard'}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                Raise an SOS, track its live status, and manage your emergency contacts.
                Records below come straight from the database — refresh anytime.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <a href="#/sos">
                  <Button variant="primary">SOS / Report incident</Button>
                </a>
                <a href="#/contacts">
                  <Button variant="outline">Emergency contacts</Button>
                </a>
                <a href="#/report-unsafe">
                  <Button variant="outline">Report unsafe area</Button>
                </a>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3">
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-ink-900">{loading ? '–' : incidents.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Total</p>
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-cream-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-gold-700">{loading ? '–' : activeCount}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Active</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="My incidents"
          description="Every SOS you submit appears here with its current status."
          action={
            !loading && !loadError && incidents.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {loading && (
            <div className="space-y-2" aria-label="Loading incidents">
              <Skeleton lines={4} />
            </div>
          )}
          {!loading && loadError && (
            <ErrorState
              title="Could not load incidents"
              description={loadError}
              onRetry={() => void load()}
            />
          )}
          {!loading && !loadError && incidents.length === 0 && (
            <EmptyState
              title="No incidents yet"
              description="When you raise an SOS, it will be recorded here with status REPORTED."
              action={
                <a href="#/sos">
                  <Button size="sm" variant="primary">
                    Raise your first SOS
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
                      {incident.locationId ? ' · with location' : ' · no location'}
                    </p>
                  </div>
                  <a
                    href={`#/incident/${incident.id}`}
                    className="shrink-0 text-sm font-semibold text-gold-700 hover:text-gold-800 sm:self-center"
                  >
                    View details →
                  </a>
                </li>
              ))}
            </ul>
          )}
          {!loading && !loadError && incidents.length > 0 && (
            <Alert variant="info" title="About response">
              Status changes are made by administrators as your incident is reviewed. This app
              cannot guarantee physical response or arrival times.
            </Alert>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
