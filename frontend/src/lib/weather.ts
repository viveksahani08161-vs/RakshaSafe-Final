import { api } from './api'

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

/** GET /api/weather — informational conditions for valid coordinates. */
export async function getWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<WeatherReport> {
  const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) })
  return api<WeatherReport>(`/weather?${params.toString()}`, signal ? { signal } : {})
}

export type WeatherConditionGroup =
  | 'clear'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'unknown'

/**
 * Group a WMO weather code into a small display bucket.
 * Unknown codes map to 'unknown' — never a fabricated description.
 */
export function weatherConditionGroup(code: number | null): WeatherConditionGroup {
  if (code === null || !Number.isInteger(code)) return 'unknown'
  if (code === 0) return 'clear'
  if (code === 1 || code === 2 || code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code === 51 || code === 53 || code === 55) return 'drizzle'
  if (
    code === 56 ||
    code === 57 ||
    code === 61 ||
    code === 63 ||
    code === 65 ||
    code === 66 ||
    code === 67 ||
    code === 80 ||
    code === 81 ||
    code === 82
  ) {
    return 'rain'
  }
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return 'snow'
  if (code === 95 || code === 96 || code === 99) return 'storm'
  return 'unknown'
}
