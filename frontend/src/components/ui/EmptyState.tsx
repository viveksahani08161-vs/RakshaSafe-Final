import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface EmptyStateProps {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title = 'Nothing here yet', description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-cream-50 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-gold-100 ring-8 ring-gold-50">
        <span className="size-3 rounded-full bg-gold-500" aria-hidden />
      </div>
      <p className="mt-4 text-base font-bold text-ink-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}