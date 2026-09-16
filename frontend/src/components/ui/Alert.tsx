import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from './icons'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps {
  variant?: AlertVariant
  title?: ReactNode
  children?: ReactNode
  className?: string
  onClose?: () => void
}

const styles: Record<AlertVariant, { box: string; icon: string; title: string; body: string }> = {
  info: {
    box: 'border-sky-200 bg-sky-50',
    icon: 'text-sky-600',
    title: 'text-sky-900',
    body: 'text-sky-800/80',
  },
  success: {
    box: 'border-emerald-200 bg-emerald-50',
    icon: 'text-emerald-600',
    title: 'text-emerald-900',
    body: 'text-emerald-800/80',
  },
  warning: {
    box: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    body: 'text-amber-800/80',
  },
  danger: {
    box: 'border-rose-200 bg-rose-50',
    icon: 'text-rose-600',
    title: 'text-rose-900',
    body: 'text-rose-800/80',
  },
}

const icons = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  danger: XCircleIcon,
}

export function Alert({ variant = 'info', title, children, className, onClose }: AlertProps) {
  const s = styles[variant]
  const Icon = icons[variant]

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border p-4', s.box, className)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', s.icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className={cn('text-sm font-semibold', s.title)}>{title}</p>}
        {children && (
          <div className={cn('mt-0.5 text-sm leading-relaxed', s.body)}>{children}</div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className={cn(
            'shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100',
            s.icon,
          )}
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  )
}