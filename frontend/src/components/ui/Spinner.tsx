import { cn } from '../../lib/cn'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
  label?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-[2.5px]',
  lg: 'size-8 border-[3px]',
}

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'animate-spin rounded-full border-ink-300 border-t-gold-500',
          sizeClasses[size],
        )}
      />
    </span>
  )
}