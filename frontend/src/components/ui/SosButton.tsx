import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { AlertTriangleIcon } from './icons'

export type SosButtonSize = 'sm' | 'md' | 'lg' | 'xl'

export interface SosButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: SosButtonSize
  pulse?: boolean
  label?: string
}

const sizeClasses: Record<SosButtonSize, string> = {
  sm: 'size-14 text-base',
  md: 'size-20 text-xl',
  lg: 'size-28 text-3xl',
  xl: 'size-36 text-4xl',
}

export function SosButton({
  size = 'md',
  pulse = true,
  label = 'SOS',
  className,
  type = 'button',
  ...rest
}: SosButtonProps) {
  return (
    <button
      type={type}
      aria-label={`${label} emergency button`}
      className={cn(
        'relative inline-flex select-none items-center justify-center rounded-full',
        'bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 text-white',
        'shadow-lg shadow-gold-600/40 ring-4 ring-gold-300/60 ring-offset-2 ring-offset-cream-100',
        'font-extrabold uppercase tracking-widest',
        'transition-transform duration-150 hover:scale-[1.04] active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-600',
        pulse && 'animate-sos-pulse',
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      <span className="flex items-center gap-2">
        <AlertTriangleIcon className="size-[0.8em]" />
        {label}
      </span>
    </button>
  )
}