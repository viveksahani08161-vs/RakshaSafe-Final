import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-500 text-white shadow-sm shadow-gold-500/25 hover:bg-gold-600 active:bg-gold-700 disabled:bg-gold-300',
  secondary:
    'bg-sky-500 text-white shadow-sm shadow-sky-500/25 hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-300',
  outline:
    'border border-ink-300 bg-white text-ink-700 hover:border-gold-400 hover:text-gold-700 hover:bg-gold-50 active:bg-gold-100 disabled:text-ink-400 dark:border-ink-700 dark:bg-transparent dark:text-ink-800 dark:hover:border-gold-500 dark:hover:bg-white/5 dark:hover:text-gold-300 dark:active:bg-white/5',
  ghost:
    'text-ink-700 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200 disabled:text-ink-400',
  danger:
    'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 dark:text-[#fff]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        icon && <span className="shrink-0 [&>svg]:size-[1.15em]">{icon}</span>
      )}
      {children}
    </button>
  )
}