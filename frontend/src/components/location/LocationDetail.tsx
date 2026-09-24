import type { IncidentLocation } from '../../lib/incidents'
import { buildMapsUrl, describeStoredArea } from '../../lib/resources'
import { formatDateTime } from '../../lib/incidents'
import { Skeleton } from '../ui/Skeleton'

interface LocationDetailProps {
  location: IncidentLocation
  /** Live-resolved address (enrichment). Stored address always wins. */
  liveAddress?: string | null
  addressLoading?: boolean
  /** Wording for device-captured locations (user view) vs reviewed ones (admin view). */
  captureNote?: string
}

/**
 * Stored incident location block: readable address first, real coordinates
 * for verification, accuracy/capture metadata, and an "Open in Maps" link
 * built from the actual coordinates only. Never invents address parts:
 * missing data degrades to "Address unavailable — coordinates available".
 */
export function LocationDetail({
  location,
  liveAddress = null,
  addressLoading = false,
  captureNote = 'Location captured from the user\u2019s device. Accuracy depends on the device/browser location provider.',
}: LocationDetailProps) {
  const storedArea = describeStoredArea(location)
  const mapsUrl = buildMapsUrl(location.latitude, location.longitude)

  return (
    <div className="space-y-3">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="font-semibold text-ink-500">Address</dt>
          <dd className="mt-0.5 text-ink-900">
            {storedArea ?? liveAddress ?? (addressLoading ? <Skeleton lines={1} /> : 'Address unavailable — coordinates available')}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-500">Latitude</dt>
          <dd className="mt-0.5 text-ink-900">{location.latitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-500">Longitude</dt>
          <dd className="mt-0.5 text-ink-900">{location.longitude.toFixed(6)}</dd>
        </div>
        {location.accuracy !== undefined && (
          <div>
            <dt className="font-semibold text-ink-500">Accuracy</dt>
            <dd className="mt-0.5 text-ink-900">±{Math.round(location.accuracy)} m</dd>
          </div>
        )}
        {location.capturedAt && (
          <div>
            <dt className="font-semibold text-ink-500">Captured</dt>
            <dd className="mt-0.5 text-ink-900">{formatDateTime(location.capturedAt)}</dd>
          </div>
        )}
      </dl>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
        >
          Open in Maps
        </a>
      )}
      <p className="text-xs text-ink-400">{captureNote}</p>
    </div>
  )
}
