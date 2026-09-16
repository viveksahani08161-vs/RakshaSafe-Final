import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDateTime, type DashboardData } from '../lib/dashboard'
import { statusBadgeVariant } from '../lib/incidents'
import { assignmentBadgeVariant } from '../lib/assignments'
import { Alert } from '../components/ui/Alert'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-4 text-center shadow-sm shadow-ink-900/5">
      <p className={`text-3xl font-extrabold ${accent ?? 'text-ink-900'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
    </div>
  )
}

/** Horizontal bars computed from real counts — no chart library, no fake data. */
function DistBars({
  entries,
  variantFor,
  emptyText,
}: {
  entries: { label: string; count: number }[]
  variantFor?: (label: string) => BadgeVariant
  emptyText: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-400">{emptyText}</p>
  }
  const max = Math.max(...entries.map((e) => e.count), 1)
  const total = entries.reduce((a, e) => a + e.count, 0)
  return (
    <ul className="space-y-2.5">
      {entries.map((e) => (
        <li key={e.label}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-semibold text-ink-700">
              {variantFor ? (
                <Badge variant={variantFor(e.label)}>{e.label}</Badge>
              ) : (
                e.label
              )}
            </span>
            <span className="shrink-0 text-xs text-ink-400">
              {e.count} · {total > 0 ? Math.round((e.count / total) * 100) : 0}%
            </span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100"
            role="img"
            aria-label={`${e.label}: ${e.count} of ${total}`}
          >
            <div
              className="h-full rounded-full bg-gold-500"
              style={{ width: `${Math.max(2, Math.round((e.count / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function priorityVariant(priority: string): BadgeVariant {
  switch (priority) {
    case 'CRITICAL':
      return 'danger'
    case 'HIGH':
      return 'warning'
    case 'MEDIUM':
      return 'secondary'
    case 'LOW':
    default:
      return 'neutral'
  }
}

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await api<DashboardData>('/admin/dashboard', signal ? { signal } : {})
      setData(res)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setFailed(true)
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

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">Admin dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            Live counts aggregated from stored records
            {data ? ` · generated ${formatDateTime(data.generatedAt)} (UTC)` : ''}.
          </p>
        </div>
        {!loading && !failed && (
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        )}
      </div>

      {loading && <Skeleton lines={8} />}
      {!loading && failed && (
        <ErrorState
          title="Dashboard unavailable"
          description="The server could not be reached. Check that the backend and database are running."
          onRetry={() => void load()}
        />
      )}

      {!loading && !failed && data && (
        <>
          {data.incidents.total === 0 && data.users.total <= 1 && (
            <Alert variant="info" title="Getting started">
              No incidents have been reported yet. Figures below will populate as real records arrive.
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Users" value={data.users.total} />
            <StatCard label="Incidents" value={data.incidents.total} />
            <StatCard label="Active" value={data.incidents.active} accent="text-gold-700" />
            <StatCard label="Facilities" value={data.facilities.operational} />
            <StatCard label="Teams" value={data.teams.active} />
            <StatCard label="Reports" value={data.unsafeReports.total} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Incidents by status" description="Documented workflow states." />
              <CardBody>
                <DistBars
                  entries={Object.entries(data.incidents.byStatus)
                    .map(([label, count]) => ({ label, count }))
                    .sort((a, b) => b.count - a.count)}
                  variantFor={statusBadgeVariant}
                  emptyText="No incidents recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Incidents by priority" description="Stored priority values." />
              <CardBody>
                <DistBars
                  entries={Object.entries(data.incidents.byPriority)
                    .map(([label, count]) => ({ label, count }))
                    .sort((a, b) => b.count - a.count)}
                  variantFor={priorityVariant}
                  emptyText="No incidents recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Incidents by type" description="Safety vs Disaster." />
              <CardBody>
                <DistBars
                  entries={Object.entries(data.incidents.byType).map(([label, count]) => ({ label, count }))}
                  emptyText="No incidents recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Assignments by status" description="Recorded movement only — not physical response." />
              <CardBody>
                <p className="mb-3 text-sm text-ink-500">{data.assignments.total} assignment(s) total.</p>
                <DistBars
                  entries={Object.entries(data.assignments.byStatus)
                    .map(([label, count]) => ({ label, count }))
                    .sort((a, b) => b.count - a.count)}
                  variantFor={assignmentBadgeVariant}
                  emptyText="No assignments recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Facilities" description="Stored operational state — never live availability." />
              <CardBody>
                <p className="mb-3 text-sm text-ink-500">
                  {data.facilities.operational} operational · {data.facilities.nonOperational} inactive ·{' '}
                  {data.facilities.total} total
                </p>
                <DistBars
                  entries={Object.entries(data.facilities.byType).map(([label, count]) => ({ label, count }))}
                  emptyText="No facilities recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Rescue teams" description="Registered team records." />
              <CardBody>
                <p className="mb-3 text-sm text-ink-500">
                  {data.teams.active} active · {data.teams.inactive} inactive · {data.teams.total} total
                </p>
                <DistBars
                  entries={
                    data.teams.total > 0
                      ? [
                          { label: 'Active', count: data.teams.active },
                          { label: 'Inactive', count: data.teams.inactive },
                        ]
                      : []
                  }
                  emptyText="No teams registered."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Unsafe-area reports" description="Review state is administrative — not AI scoring." />
              <CardBody>
                <p className="mb-3 text-sm text-ink-500">
                  {data.unsafeReports.verified} verified · {data.unsafeReports.unverified} pending ·{' '}
                  {data.unsafeReports.total} total
                </p>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-400">Top categories</p>
                <DistBars
                  entries={data.unsafeReports.byCategory.map((c) => ({ label: c.value, count: c.count }))}
                  emptyText="No reports recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Risk assessments" description="Historical decision support — not predictions." />
              <CardBody>
                <p className="mb-3 text-sm text-ink-500">{data.risk.total} assessment(s) stored.</p>
                <DistBars
                  entries={Object.entries(data.risk.byLevel)
                    .map(([label, count]) => ({ label, count }))
                    .sort((a, b) => b.count - a.count)}
                  variantFor={(l) =>
                    l === 'LOW' ? 'success' : l === 'MEDIUM' ? 'secondary' : l === 'HIGH' ? 'warning' : 'danger'
                  }
                  emptyText="No assessments stored."
                />
                {data.risk.recent.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm text-ink-500">
                    {data.risk.recent.map((r) => (
                      <li key={r.id}>
                        Score {r.riskScore} ({r.riskLevel}) · {r.modelVersion} · {formatDateTime(r.assessedAt)}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Notifications" description="Actual stored delivery states." />
              <CardBody>
                <p className="mb-3 text-sm text-ink-500">{data.notifications.total} notification(s) total.</p>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-400">By status</p>
                <DistBars
                  entries={Object.entries(data.notifications.byStatus)
                    .map(([label, count]) => ({ label, count }))
                    .sort((a, b) => b.count - a.count)}
                  variantFor={(s) =>
                    s === 'DELIVERED' ? 'success' : s === 'FAILED' ? 'danger' : s === 'QUEUED' || s === 'SENT' ? 'warning' : 'neutral'
                  }
                  emptyText="No notifications recorded."
                />
                <p className="mb-1 mt-4 text-xs font-bold uppercase tracking-widest text-ink-400">By channel</p>
                <DistBars
                  entries={Object.entries(data.notifications.byChannel).map(([label, count]) => ({ label, count }))}
                  emptyText="No notifications recorded."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent incidents" description="Latest SOS records." />
              <CardBody>
                {data.incidents.recent.length === 0 ? (
                  <EmptyState title="No incidents yet" description="New SOS reports will appear here." />
                ) : (
                  <ul className="space-y-2">
                    {data.incidents.recent.map((i) => (
                      <li key={i.id}>
                        <a
                          href={`#/admin/incidents/${i.id}`}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200/70 p-3 transition-colors hover:border-gold-300 hover:bg-gold-50/50"
                        >
                          <Badge variant={statusBadgeVariant(i.status)} dot>
                            {i.status}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">
                            {i.category}
                          </span>
                          <span className="text-xs text-ink-400">{formatDateTime(i.createdAt)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Recent administrative activity" description="Latest admin actions (no secrets shown)." />
            <CardBody>
              {data.recentActivity.length === 0 ? (
                <EmptyState title="No activity yet" description="Administrative actions will be logged here." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <Badge variant="secondary">{a.action}</Badge>
                      <span className="text-ink-500">{a.targetType}</span>
                      <span className="ml-auto text-xs text-ink-400">{formatDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
