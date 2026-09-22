import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export interface PaginationProps {
  current: number
  totalPages: number
  onPageChange: (page: number) => void
  siblingCount?: number
  className?: string
  showSummary?: boolean
}

function getPageItems(current: number, total: number, siblings: number): (number | '…')[] {
  if (total <= 1) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const left = Math.max(2, current - siblings)
  const right = Math.min(total - 1, current + siblings)
  const items: (number | '…')[] = [1]
  if (left > 2) items.push('…')
  for (let page = left; page <= right; page += 1) items.push(page)
  if (right < total - 1) items.push('…')
  items.push(total)
  return items
}

export function Pagination({
  current,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  showSummary = true,
}: PaginationProps) {
  const items = useMemo(
    () => getPageItems(current, totalPages, siblingCount),
    [current, totalPages, siblingCount],
  )

  if (totalPages <= 1) return null

  const base =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-xl border text-sm font-semibold transition-colors'

  return (
    <div className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}>
      {showSummary && (
        <p className="text-sm text-ink-500">
          Page {current} of {totalPages}
        </p>
      )}
      <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className={cn(
            base,
            'border-ink-200 bg-white text-ink-700 hover:border-gold-300 hover:text-gold-700 dark:hover:border-gold-500 dark:hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-700',
          )}
        >
          <ChevronLeftIcon className="size-4" />
        </button>

        {items.map((item, index) =>
          item === '…' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-ink-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === current ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                base,
                item === current
                  ? 'border-gold-500 bg-gold-500 text-white shadow-sm shadow-gold-500/30'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-gold-300 hover:text-gold-700 dark:hover:border-gold-500 dark:hover:text-gold-300',
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
          className={cn(
            base,
            'border-ink-200 bg-white text-ink-700 hover:border-gold-300 hover:text-gold-700 dark:hover:border-gold-500 dark:hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-700',
          )}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </nav>
    </div>
  )
}