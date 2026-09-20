import { TtlCache, coordsCacheKey } from '../utils/geo.js'

export interface WeatherCurrent {
  temperatureC: number | null
  humidityPct: number | null
  precipitationMm: number | null
  windKph: number | null
  weatherCode: number | null
}

export interface WeatherToday {
  date: string | null
  maxC: number | null
  minC: number | null
  precipitationProbMax: number | null
}

export interface WeatherReport {
  current: WeatherCurrent
  today: WeatherToday
}

export type WeatherStatus = 'ok' | 'error'

export interface WeatherOutcome {
  weather: WeatherReport | null
  status: WeatherStatus
  error?: string
}

const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'
const TIMEOUT_MS = 10000
const CACHE_TTL_MS = 10 * 60 * 1000

const cache = new TtlCache<WeatherReport>(CACHE_TTL_MS, 200)

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export interface WeatherOptions {
  baseUrl?: string
  timeoutMs?: number
}

/**
 * Current + today weather via Open-Meteo (no API key).
 * Returns { status: 'error' } on any failure — callers show
 * "Weather unavailable" and never fabricate conditions.
 */
export async function getWeather(
  latitude: number,
  longitude: number,
  options: WeatherOptions = {},
): Promise<WeatherOutcome> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { weather: null, status: 'error', error: 'Invalid coordinates.' }
  }
  const key = coordsCacheKey(latitude, longitude, 2)
  const cached = cache.get(key)
  if (cached !== undefined) return { weather: cached, status: 'ok' }

  const baseUrl = options.baseUrl ?? WEATHER_BASE
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      daily: 'temperature_2_max,temperature_2_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: '1',
    })
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) return { weather: null, status: 'error', error: 'Weather unavailable.' }
    const data = (await res.json()) as {
      current?: Record<string, number>
      daily?: { time?: string[] } & Record<string, number[] | string[] | undefined>
    };
    const current = data.current ?? {}
    const daily = data.daily ?? {}
    const first = <T>(v: T[] | undefined): T | null => (Array.isArray(v) && v.length > 0 ? v[0] : null)
    const report: WeatherReport = {
      current: {
        temperatureC: finiteOrNull(current.temperature_2),
        humidityPct: finiteOrNull(current.relative_humidity_2m),
        precipitationMm: finiteOrNull(current.precipitation),
        windKph: finiteOrNull(current.wind_speed_10m),
        weatherCode: Number.isInteger(current.weather_code) ? (current.weather_code as number) : null,
      },
      today: {
        date: typeof first(daily.time) === 'string' ? (first(daily.time) as string) : null,
        maxC: finiteOrNull(first(daily.temperature_2_max as number[] | undefined)),
        minC: finiteOrNull(first(daily.temperature_2_min as number[] | undefined)),
        precipitationProbMax: finiteOrNull(first(daily.precipitation_probability_max as number[] | undefined)),
      },
    }
    if (report.current.temperatureC === null && report.current.weatherCode === null) {
      return { weather: null, status: 'error', error: 'Weather unavailable.' }
    }
    cache.set(key, report)
    return { weather: report, status: 'ok' }
  } catch {
    return { weather: null, status: 'error', error: 'Weather unavailable.' }
  } finally {
    clearTimeout(timer)
  }
}
