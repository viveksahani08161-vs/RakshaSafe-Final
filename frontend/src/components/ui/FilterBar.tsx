import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FilterIcon } from './icons'

export interface FilterBarProps {
  search?: ReactNode
  filters?: ReactNode
  actions?: ReactNode
  resultCount?: ReactNode
  onReset?: () => void
  resetLabel?: string
  className?: string
}

export function FilterBar({
  search,
  filters,
  actions,
  resultCount,
  onReset,
  resetLabel = 'Clear filters',
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {search && <div className="min-w-0 flex-1 lg:max-w-sm">{search}</div>}
        {filters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <FilterIcon className="size-3.5" />
              Filter
            </span>
            {filters}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                {resetLabel}
              </button>
            )}
          </div>
        )}
      </div>
      {(resultCount || actions) && (
        <div className="mt-3 flex flex-col gap-3 border-t border-ink-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          {resultCount && (
            <p className="text-sm text-ink-500">{resultCount}</p>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  )
}