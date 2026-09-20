import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'
import { getOsmNearby, getReverseAddress, type NearbyResource, type ReverseAddress } from './resources'
import { getWeather, type WeatherReport } from './weather'

export interface Enrichment {
  address: ReverseAddress | null
  addressLoading: boolean
  osm: NearbyResource[]
  osmLoading: boolean
  osmError: string | null
  weather: WeatherReport | null
  weatherLoading: boolean
  weatherError: string | null
  reload: () => void
}

const empty: Enrichment = {
  address: null,
  addressLoading: false,
  osm: [],
  osmLoading: false,
  osmError: null,
  weather: null,
  weatherLoading: false,
  weatherError: null,
  reload: () => undefined,
}

/**
 * Post-persistence enrichment for real coordinates: readable address,
 * mapped nearby facilities, and weather. Every source fails independently
 * into "unavailable" states — enrichment never affects incident creation.
 */
export function useEnrichment(
  latitude: number | null,
  longitude: number | null,
  enabled: boolean,
): Enrichment {
  const [address, setAddress] = useState<ReverseAddress | null>(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [osm, setOsm] = useState<NearbyResource[]>([])
  const [osmLoading, setOsmLoading] = useState(false)
  const [osmError, setOsmError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherReport | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) {
      setAddress(null)
      setAddressLoading(false)
      setOsm([])
      setOsmLoading(false)
      setOsmError(null)
      setWeather(null)
      setWeatherLoading(false)
      setWeatherError(null)
      return
    }
    const controller = new AbortController()
    const { signal } = controller
    setAddressLoading(true)
    setOsmLoading(true)
    setOsmError(null)
    setWeatherLoading(true)
    setWeatherError(null)
    void getReverseAddress(latitude, longitude, signal)
      .then((result) => {
        if (!signal.aborted) setAddress(result)
      })
      .catch(() => {
        if (!signal.aborted) setAddress(null)
      })
      .finally(() => {
        if (!signal.aborted) setAddressLoading(false)
      })
    void getOsmNearby(latitude, longitude, undefined, signal)
      .then((result) => {
        if (!signal.aborted) setOsm(result.facilities)
      })
      .catch((err: unknown) => {
        if (signal.aborted) return
        setOsm([])
        setOsmError(err instanceof ApiError ? err.message : 'Nearby lookup unavailable.')
      })
      .finally(() => {
        if (!signal.aborted) setOsmLoading(false)
      })
    void getWeather(latitude, longitude, signal)
      .then((result) => {
        if (!signal.aborted) setWeather(result)
      })
      .catch((err: unknown) => {
        if (signal.aborted) return
        setWeather(null)
        setWeatherError(err instanceof ApiError ? err.message : 'Weather unavailable.')
      })
      .finally(() => {
        if (!signal.aborted) setWeatherLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, latitude, longitude, nonce])

  if (!enabled || latitude === null || longitude === null) return { ...empty, reload }
  return {
    address,
    addressLoading,
    osm,
    osmLoading,
    osmError,
    weather,
    weatherLoading,
    weatherError,
    reload,
  }
}
