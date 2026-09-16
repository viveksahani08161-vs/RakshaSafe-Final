import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  primary: 'bg-gold-100 text-gold-800 ring-1 ring-gold-300/60',
  secondary: 'bg-sky-100 text-sky-800 ring-1 ring-sky-300/60',
  success: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/60',
  warning: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/60',
  danger: 'bg-rose-100 text-rose-800 ring-1 ring-rose-300/60',
  outline: 'bg-white text-ink-700 ring-1 ring-ink-300',
}

const dotClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-ink-400',
  primary: 'bg-gold-500',
  secondary: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  outline: 'bg-ink-400',
}

export function Badge({ variant = 'neutral', dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dotClasses[variant])} />}
      {children}
    </span>
  )
}