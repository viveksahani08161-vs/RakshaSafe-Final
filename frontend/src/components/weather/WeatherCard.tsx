import { useI18n, type DictKey } from '../../lib/i18n'
import { weatherConditionGroup, type WeatherConditionGroup, type WeatherReport } from '../../lib/weather'
import { Alert } from '../ui/Alert'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'

const CONDITION_KEYS: Record<WeatherConditionGroup, DictKey> = {
  clear: 'weather.condition.clear',
  cloudy: 'weather.condition.cloudy',
  fog: 'weather.condition.fog',
  drizzle: 'weather.condition.drizzle',
  rain: 'weather.condition.rain',
  snow: 'weather.condition.snow',
  storm: 'weather.condition.storm',
  unknown: 'weather.condition.unknown',
}

interface WeatherCardProps {
  weather: WeatherReport | null
  loading: boolean
  loadError: string | null
  onRetry: () => void
}

/**
 * Informational weather for real coordinates. Every value comes from
 * Open-Meteo; missing values render as "unavailable", never guessed.
 */
export function WeatherCard({ weather, loading, loadError, onRetry }: WeatherCardProps) {
  const { t } = useI18n()
  const condition = weatherConditionGroup(weather?.current.weatherCode ?? null)

  return (
    <Card>
      <CardHeader title={t('weather.title')} description={t('weather.disclaimer')} />
      <CardBody>
        {loading && <Skeleton lines={3} />}
        {!loading && loadError && (
          <ErrorState title={t('weather.unavailable')} description={loadError} onRetry={onRetry} />
        )}
        {!loading && !loadError && !weather && (
          <p className="text-sm text-ink-500">{t('weather.unavailable')}</p>
        )}
        {!loading && !loadError && weather && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink-500">{t('weather.condition')}</dt>
              <dd className="mt-0.5 text-ink-900">{t(CONDITION_KEYS[condition])}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">{t('weather.temperature')}</dt>
              <dd className="mt-0.5 text-ink-900">
                {weather.current.temperatureC !== null ? `${weather.current.temperatureC} °C` : t('weather.unavailable')}
                {weather.today.maxC !== null && weather.today.minC !== null &&
                  ` (${weather.today.minC}–${weather.today.maxC} °C)`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">{t('weather.precipitation')}</dt>
              <dd className="mt-0.5 text-ink-900">
                {weather.current.precipitationMm !== null
                  ? `${weather.current.precipitationMm} mm`
                  : t('weather.unavailable')}
                {weather.today.precipitationProbMax !== null && ` (${weather.today.precipitationProbMax}%)`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">{t('weather.wind')}</dt>
              <dd className="mt-0.5 text-ink-900">
                {weather.current.windKph !== null ? `${weather.current.windKph} km/h` : t('weather.unavailable')}
              </dd>
            </div>
          </dl>
        )}
        <Alert variant="info" title={t('weather.title')}>
          {t('weather.disclaimer')}
        </Alert>
      </CardBody>
    </Card>
  )
}
