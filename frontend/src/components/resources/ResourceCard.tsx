import { useI18n } from '../../lib/i18n'
import {
  buildResourceDirectionsUrl,
  buildTelHref,
  describeDistance,
  type NearbyResource,
} from '../../lib/resources'
import { Badge } from '../ui/Badge'
import { BuildingIcon, MapPinIcon, PhoneIcon, UsersIcon } from '../ui/icons'

interface ResourceCardProps {
  resource: NearbyResource
  /** Admin view additionally shows raw stored coordinates. */
  showCoordinates?: boolean
}

/**
 * One real emergency resource (stored record or mapped place). Every field
 * renders values actually present in the source: CALL dials a real phone via
 * tel: (browser dialer, no backend call) and appears only when a phone
 * exists; Directions opens navigation to real coordinates and is hidden
 * entirely when coordinates are missing.
 */
export function ResourceCard({ resource, showCoordinates = false }: ResourceCardProps) {
  const { t } = useI18n()
  const directionsUrl = buildResourceDirectionsUrl(resource)
  const distance = describeDistance(resource.distanceKm)

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink-900">{resource.name}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
            {resource.resourceType}
          </p>
          <p className="mt-1">
            <Badge variant="outline">
              {resource.source === 'GOOGLE_PLACES'
                ? t('nearby.source.google')
                : resource.source === 'OSM'
                  ? t('nearby.source.osm')
                  : t('nearby.source.rakshasafe')}
            </Badge>
          </p>
        </div>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          {resource.kind === 'facility' ? (
            <BuildingIcon className="size-5" />
          ) : (
            <UsersIcon className="size-5" />
          )}
        </span>
      </div>
      {distance && (
        <p className="text-sm font-extrabold text-gold-700 dark:text-gold-300">
          {distance.unit === 'm'
            ? t('nearby.distanceMeters', { distance: distance.value })
            : t('nearby.distance', { distance: distance.value })}
        </p>
      )}
      <p className="flex items-start gap-1.5 text-sm text-ink-800">
        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-400" />
        <span>
          <span className="font-semibold">{t('nearby.address')}: </span>
          {resource.address ?? t('nearby.addressUnavailable')}
        </span>
      </p>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
        <PhoneIcon className="size-4 shrink-0 text-ink-400" />
        <span>
          {t('nearby.phone')}: {resource.phone ?? t('nearby.phoneUnavailable')}
        </span>
      </p>
      {resource.website && (
        <p className="flex items-center gap-1.5 text-sm text-ink-800">
          <span className="font-semibold">{t('nearby.website')}: </span>
          <a
            href={resource.website}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sky-700 underline underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
          >
            {resource.website}
          </a>
        </p>
      )}
      {showCoordinates && resource.latitude !== null && resource.longitude !== null && (
        <p className="text-xs text-ink-500">
          {t('nearby.coordinates')}: {resource.latitude.toFixed(6)}, {resource.longitude.toFixed(6)}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {resource.capacity !== undefined && (
          <Badge variant="neutral">{t('nearby.capacity', { capacity: resource.capacity })}</Badge>
        )}
        {resource.operatingHours && <Badge variant="outline">{resource.operatingHours}</Badge>}
        {resource.specializations?.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        {resource.phone && (
          <a
            href={buildTelHref(resource.phone)}
            className="inline-flex h-10 items-center rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600"
          >
            {t('nearby.call')}
          </a>
        )}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            {t('nearby.directions')}
          </a>
        )}
      </div>
    </li>
  )
}
