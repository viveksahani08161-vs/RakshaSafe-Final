import { useState, type FormEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useI18n, type DictKey } from '../../lib/i18n'
import { Button } from './Button'
import { SearchIcon, MapPinIcon } from './icons'
import { api } from '../../lib/api'

export interface AddressSearchProps {
  onResult?: (result: { latitude: number; longitude: number; displayAddress: string }) => void
  disabled?: boolean
  className?: string
  label?: ReactNode
}

export function AddressSearch({
  onResult,
  disabled = false,
  className,
  label,
}: AddressSearchProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<{ latitude: number; longitude: number; displayAddress: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setSearching(true)
    setError(null)
    try {
      const res = await api<{ latitude: number; longitude: number; displayAddress: string }>(
        `/geocode/geocode?q=${encodeURIComponent(trimmed)}`,
      )
      const resultData = {
        latitude: res.latitude,
        longitude: res.longitude,
        displayAddress: res.displayAddress,
      }
      setResult(resultData)
      onResult?.(resultData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search location'
      setError(message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="block text-sm font-semibold text-ink-700">{label}</label>
      )}
      <form onSubmit={(e) => void handleSearch(e)} className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-ink-400">
            <SearchIcon className="size-4" />
          </span>
          <input
            type="search"
            autoComplete="address"
            placeholder={t('geocode.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled || searching}
            className="h-11 w-full appearance-none rounded-xl border bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 dark:placeholder:text-ink-500 border-ink-200 shadow-sm transition-colors focus:border-gold-400 focus:ring-2 focus:ring-gold-300/50 focus:outline-none disabled:bg-ink-50 disabled:cursor-not-allowed"
          />
          {query && !searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-3 my-auto flex size-5 items-center justify-center rounded-full bg-ink-200 text-ink-600 transition-colors hover:bg-ink-300"
              aria-label={t('aria.clearSearch') ?? 'Clear search'}
            >
              <span className="size-3" aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={searching}
          disabled={disabled || searching || !query.trim()}
        >
          {searching ? t('geocode.searching') : t('geocode.search')}
        </Button>
        {error && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
      </form>
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">{t('geocode.manualLabel')}</span>
          </div>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{result.displayAddress}</p>
          <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
            {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setQuery('')
            }}
            className="mt-2 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            {t('geocode.change' as DictKey)}
          </button>
        </div>
      )}
      <p className="text-[11px] text-ink-400 text-center">
        {t('geocode.attribution')}
      </p>
    </div>
  )
}