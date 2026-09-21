import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useI18n } from '../../lib/i18n'

export interface SafetyMapMarker {
  latitude: number
  longitude: number
  label: string
  kind: 'user' | 'police' | 'hospital' | 'fire' | 'ambulance' | 'other'
}

interface SafetyMapProps {
  center: { latitude: number; longitude: number }
  markers: SafetyMapMarker[]
}

const MARKER_COLORS: Record<SafetyMapMarker['kind'], string> = {
  user: '#d49d26',
  police: '#247bb8',
  hospital: '#dc2626',
  fire: '#ea580c',
  ambulance: '#0d9488',
  other: '#16a34a',
}

/**
 * Real map: user position + nearby facilities from actual coordinates only.
 * Leaflet + OpenStreetMap tiles (no API key). The library loads lazily so
 * the rest of the page never depends on it; records without coordinates
 * never receive markers.
 */
export function SafetyMap({ center, markers }: SafetyMapProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const userLabel = t('nearby.yourLocation')

  useEffect(() => {
    let cancelled = false
    let map: LeafletMap | null = null
    async function init(): Promise<void> {
      const leaflet = await import('leaflet')
      if (cancelled || !containerRef.current) return
      map = leaflet.map(containerRef.current, { scrollWheelZoom: false })
      map.setView([center.latitude, center.longitude], 14)
      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: t('map.attribution'),
        })
        .addTo(map)
      leaflet
        .circleMarker([center.latitude, center.longitude], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: MARKER_COLORS.user,
          fillOpacity: 1,
        })
        .bindTooltip(userLabel)
        .addTo(map)
      for (const marker of markers) {
        if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) continue
        leaflet
          .circleMarker([marker.latitude, marker.longitude], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: MARKER_COLORS[marker.kind],
            fillOpacity: 1,
          })
          .bindTooltip(marker.label)
          .addTo(map)
      }
    }
    void init()
    return () => {
      cancelled = true
      map?.remove()
      map = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.latitude, center.longitude, markers])

  return <div ref={containerRef} className="z-0 h-64 w-full rounded-2xl sm:h-80" role="img" aria-label="Map of your location and nearby facilities" />
}
