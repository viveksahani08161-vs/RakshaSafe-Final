import { useI18n } from '../../lib/i18n'
import type { NearbyResource } from '../../lib/resources'
import { Alert } from '../ui/Alert'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import { NearbyResourceGroups } from './NearbyResourceGroups'
import { ResourceCard } from './ResourceCard'

interface NearbyResourcesSectionProps {
  resources: NearbyResource[]
  loading: boolean
  loadError: string | null
  onRetry: () => void
  /** Radius used for the query — shown in the empty state. */
  radiusKm?: number
  /** Override for the empty-state description (e.g. mapped-data wording). */
  emptyText?: string
  /** Admin view additionally shows raw stored coordinates per card. */
  showCoordinates?: boolean
  /** Render grouped Hospitals/Police/Fire/Teams sections instead of a flat list. */
  grouped?: boolean
  /** Honest provider notice (e.g. external lookup unavailable), or null. */
  notice?: string | null
  /** Extra honest line under the list (e.g. awaiting-assignment note). */
  extraNote?: string
  /** Section title override — incident contexts say "around the recorded location". */
  titleKey?: 'nearby.title' | 'nearby.recordedLocation'
}

/**
 * Shared nearest-first resource list with honest states.
 * Never claims dispatch, availability, ETA, or response — the footnote
 * states the records are stored information to contact directly.
 */
export function NearbyResourcesSection({
  resources,
  loading,
  loadError,
  onRetry,
  radiusKm,
  showCoordinates = false,
  grouped = false,
  notice,
  extraNote,
  emptyText,
  titleKey = 'nearby.title',
}: NearbyResourcesSectionProps) {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader title={t(titleKey)} description={t('nearby.subtitle')} />
      <CardBody>
        <div className="space-y-4">
          {loading && <Skeleton lines={4} />}
          {!loading && loadError && (
            <ErrorState title={t('nearby.loadError')} description={loadError} onRetry={onRetry} />
          )}
          {notice && (
            <Alert variant="warning" title={t('nearby.title')}>
              {notice}
            </Alert>
          )}
          {!loading && !loadError && resources.length === 0 && (
            <EmptyState
              title={t('nearby.title')}
              description={
                emptyText ??
                (radiusKm !== undefined ? t('nearby.empty', { radius: radiusKm }) : t('nearby.subtitle'))
              }
            />
          )}
          {!loading && !loadError && resources.length > 0 && grouped && (
            <NearbyResourceGroups resources={resources} showCoordinates={showCoordinates} />
          )}
          {!loading && !loadError && resources.length > 0 && !grouped && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <ResourceCard key={`${r.source}:${r.kind}:${r.id}`} resource={r} showCoordinates={showCoordinates} />
              ))}
            </ul>
          )}
          {extraNote && <p className="text-sm font-semibold text-ink-700">{extraNote}</p>}
          <p className="text-sm text-ink-500">{t('nearby.contactDirectly')}</p>
          <p className="text-sm text-ink-500">{t('nearby.referenceNote')}</p>
          <Alert variant="info" title={t('nearby.title')}>
            {t('nearby.honestNote')}
          </Alert>
        </div>
      </CardBody>
    </Card>
  )
}
