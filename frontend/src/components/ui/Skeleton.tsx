import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
  lastLineWidth?: string
}

export function Skeleton({ lines = 1, lastLineWidth = '60%', className, style, ...rest }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)} {...rest}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-md bg-ink-200/70"
          style={{
            width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
            ...style,
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonText({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse h-4 rounded-md bg-ink-200/70', className)} {...rest} />
  )
}

export function SkeletonAvatar({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse size-10 rounded-full bg-ink-200/70', className)}
      {...rest}
    />
  )
}

export function SkeletonCard({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse space-y-3 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm',
        className,
      )}
      {...rest}
    >
      <SkeletonText className="w-1/3" />
      <Skeleton lines={3} />
      <SkeletonText className="w-1/2 mt-2" />
    </div>
  )
}