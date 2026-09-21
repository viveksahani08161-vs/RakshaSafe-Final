import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { type DashboardData } from '../lib/dashboard'
import { statusBadgeVariant } from '../lib/incidents'
import { Alert } from '../components/ui/Alert'
import { Badge, type BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { UsersIcon, ShieldCheckIcon, ActivityIcon, AlertTriangleIcon, ChevronRightIcon } from '../components/ui/icons'
import { useI18n } from '../lib/i18n'
import { EmergencyHelplines } from '../components/dashboard/EmergencyHelplines'

function StatCard({ label, value, icon, accent, onClick }: { 
  label: string
  value: number
  icon: React.ReactNode
  accent?: string
  onClick?: () => void
}) {
  return (
    <div 
      className={`rounded-2xl border border-ink-200/70 bg-white p-5 text-center shadow-sm shadow-ink-900/5 transition-colors ${onClick ? 'cursor-pointer hover:border-gold-300 hover:bg-gold-50/50' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
    >
      <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gold-50 text-gold-700 mb-3 mx-auto">
        {icon}
      </div>
      <p className={`text-3xl font-extrabold ${accent ?? 'text-ink-900'}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
    </div>
  )
}

/** Compact status display with count and badge - no progress bars */
function StatusRow({ label, count, variant, onClick }: { 
  label: string
  count: number
  variant: BadgeVariant
  onClick?: () => void
}) {
  return (
    <div 
      className={`flex items-center justify-between gap-3 rounded-xl border border-ink-200/70 bg-white p-3 transition-colors ${onClick ? 'cursor-pointer hover:border-gold-300 hover:bg-gold-50/50' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
    >
      <span className="font-medium text-ink-700">{label}</span>
      <div className="flex items-center gap-2">
        <Badge variant={variant} className="text-xs">{count}</Badge>
        {onClick && <ChevronRightIcon className="size-4 text-ink-400" />}
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { t } = useI18n()
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

  const navigateToIncidents = () => {
    window.location.href = '#/admin/incidents'
  }

  const navigateToFacilities = () => {
    window.location.href = '#/admin/facilities'
  }

  const navigateToTeams = () => {
    window.location.href = '#/admin/teams'
  }

  const navigateToUsers = () => {
    window.location.href = '#/admin/users'
  }

  const navigateToReports = () => {
    window.location.href = '#/admin/reports'
  }

  const navigateToUnsafeReports = () => {
    window.location.href = '#/admin/unsafe-reports'
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">{t('admin.dashboard.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('admin.dashboard.subtitle')}</p>
        </div>
        {!loading && !failed && (
          <Button size="sm" variant="outline" onClick={() => void load()}>
            {t('admin.dashboard.refresh')}
          </Button>
        )}
      </div>

      {/* Emergency Helplines */}
      <EmergencyHelplines />

      {loading && <Skeleton lines={6} />}
      {!loading && failed && (
        <ErrorState
          title={t('admin.dashboard.errorTitle')}
          description={t('admin.dashboard.errorDescription')}
          onRetry={() => void load()}
        />
      )}

      {!loading && !failed && data && (
        <>
          {data.incidents.total === 0 && data.users.total <= 1 && (
            <Alert variant="info" title={t('admin.dashboard.gettingStarted')}>
              {t('admin.dashboard.noIncidentsYet')}
            </Alert>
          )}

          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label={t('admin.dashboard.cards.users')}
              value={data.users.total}
              icon={<UsersIcon className="size-6" />}
              onClick={navigateToUsers}
            />
            <StatCard
              label={t('admin.dashboard.cards.activeIncidents')}
              value={data.incidents.active}
              icon={<AlertTriangleIcon className="size-6" />}
              accent="text-rose-700"
              onClick={navigateToIncidents}
            />
            <StatCard
              label={t('admin.dashboard.cards.totalIncidents')}
              value={data.incidents.total}
              icon={<ActivityIcon className="size-6" />}
              onClick={navigateToIncidents}
            />
            <StatCard
              label={t('admin.dashboard.cards.rescueTeams')}
              value={data.teams.active}
              icon={<ShieldCheckIcon className="size-6" />}
              accent="text-emerald-700"
              onClick={navigateToTeams}
            />
          </div>

          {/* Incident Overview + Operational Snapshot */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Incident Overview */}
            <Card>
              <CardHeader 
                title={t('admin.dashboard.incidentOverview.title')} 
                description={t('admin.dashboard.incidentOverview.subtitle')} 
                action={
                  <Button size="sm" variant="ghost" onClick={navigateToIncidents}>
                    {t('common.viewDetails')}
                    <ChevronRightIcon className="size-4 ml-1" />
                  </Button>
                }
              />
              <CardBody>
                <div className="space-y-2">
                  {Object.entries(data.incidents.byStatus).length > 0 ? (
                    Object.entries(data.incidents.byStatus)
                      .map(([label, count]) => ({ label, count }))
                      .sort((a, b) => b.count - a.count)
                      .map(({ label, count }) => (
                        <StatusRow
                          key={label}
                          label={label}
                          count={count}
                          variant={statusBadgeVariant(label)}
                          onClick={navigateToIncidents}
                        />
                      ))
                  ) : (
                    <p className="text-sm text-ink-400 text-center py-4">{t('admin.dashboard.empty')}</p>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Operational Snapshot */}
            <Card>
              <CardHeader 
                title={t('admin.dashboard.operationalSnapshot.title')} 
                description={t('admin.dashboard.operationalSnapshot.subtitle')} 
              />
              <CardBody>
                <div className="space-y-2">
                  <StatusRow
                    label={t('admin.dashboard.operationalSnapshot.facilities')}
                    count={data.facilities.operational}
                    variant="secondary"
                    onClick={navigateToFacilities}
                  />
                  <StatusRow
                    label={t('admin.dashboard.operationalSnapshot.rescueTeams')}
                    count={data.teams.active}
                    variant="success"
                    onClick={navigateToTeams}
                  />
                  <StatusRow
                    label={t('admin.dashboard.operationalSnapshot.unsafeReports')}
                    count={data.unsafeReports.total}
                    variant="warning"
                    onClick={navigateToUnsafeReports}
                  />
                  <StatusRow
                    label={t('admin.dashboard.operationalSnapshot.reports')}
                    count={data.unsafeReports.verified + data.unsafeReports.unverified}
                    variant="outline"
                    onClick={navigateToReports}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}