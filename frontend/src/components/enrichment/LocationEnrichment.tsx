import { useI18n } from '../../lib/i18n'
import type { Enrichment } from '../../lib/useEnrichment'
import type { NearbyResource } from '../../lib/resources'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { SafetyMap, type SafetyMapMarker } from '../map/SafetyMap'
import { NearbyResourcesSection } from '../resources/NearbyResourcesSection'
import { WeatherCard } from '../weather/WeatherCard'

interface LocationEnrichmentProps {
  latitude: number
  longitude: number
  accuracy?: number
  enrichment: Enrichment
}

function markerKind(resource: NearbyResource): SafetyMapMarker['kind'] {
  switch (resource.category) {
    case 'hospital':
    case 'clinic':
      return 'hospital'
    case 'police':
      return 'police'
    case 'fire_station':
      return 'fire'
    case 'ambulance_station':
      return 'ambulance'
    default:
      break
  }
  if (resource.resourceType === 'Hospital' || resource.resourceType === 'Clinic') return 'hospital'
  if (resource.resourceType === 'Police Station' || resource.resourceType === 'Police') return 'police'
  if (resource.resourceType === 'Fire Station') return 'fire'
  if (resource.resourceType === 'Ambulance Station') return 'ambulance'
  return 'other'
}

/**
 * Post-incident enrichment display: readable address, real map, mapped
 * nearby facilities, and weather. Each source degrades independently into
 * "unavailable" states; the incident itself is never affected.
 */
export function LocationEnrichment({ latitude, longitude, accuracy, enrichment }: LocationEnrichmentProps) {
  const { t } = useI18n()
  const markers: SafetyMapMarker[] = enrichment.osm
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      label: r.name,
      kind: markerKind(r),
    }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {(enrichment.addressLoading || enrichment.osmLoading || enrichment.weatherLoading) &&
            t('sos.enriching')}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={enrichment.addressLoading || enrichment.osmLoading || enrichment.weatherLoading}
          onClick={enrichment.reload}
        >
          {t('nearby.refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader title={t('nearby.yourLocation')} />
        <CardBody>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink-500">{t('nearby.coordinates')}</dt>
              <dd className="mt-0.5 text-ink-900">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                {accuracy !== undefined && ` (±${Math.round(accuracy)} m)`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">{t('nearby.address')}</dt>
              <dd className="mt-0.5 text-ink-900">
                {enrichment.addressLoading ? (
                  <Skeleton lines={1} />
                ) : (
                  (enrichment.address?.displayName ?? t('nearby.addressUnavailable'))
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <SafetyMap center={{ latitude, longitude }} markers={markers} />
            <p className="mt-2 text-xs text-ink-400">{t('map.attribution')}</p>
          </div>
        </CardBody>
      </Card>

      <NearbyResourcesSection
        resources={enrichment.osm}
        loading={enrichment.osmLoading}
        loadError={enrichment.osmError}
        onRetry={enrichment.reload}
        grouped
        emptyText={t('nearby.osmEmpty')}
      />

      <WeatherCard
        weather={enrichment.weather}
        loading={enrichment.weatherLoading}
        loadError={enrichment.weatherError}
        onRetry={enrichment.reload}
      />
    </div>
  )
}
