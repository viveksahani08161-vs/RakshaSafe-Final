import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { AlertTriangleIcon } from './icons'

export interface ErrorStateProps {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center dark:border-rose-800 dark:bg-rose-500/10',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-rose-100 ring-8 ring-rose-50 dark:bg-rose-500/20 dark:ring-rose-400/20">
        <AlertTriangleIcon className="size-6 text-rose-600 dark:text-rose-400" />
      </div>
      <p className="mt-4 text-base font-bold text-rose-900 dark:text-rose-100">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-rose-800/80 dark:text-rose-200/80">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-11 rounded-xl border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 dark:border-rose-700 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}