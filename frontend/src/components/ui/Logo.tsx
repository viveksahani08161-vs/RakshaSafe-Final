import { cn } from '../../lib/cn'

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

export interface LogoProps {
  size?: LogoSize
  withWordmark?: boolean
  href?: string
  className?: string
}

const imageSize: Record<LogoSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-14',
  xl: 'size-20',
}

const wordmarkSize: Record<LogoSize, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
}

export function Logo({ size = 'md', withWordmark = true, href, className }: LogoProps) {
  const content = (
    <>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-ink-200/80 shadow-sm',
          imageSize[size],
        )}
      >
        <img
          src="/assets/raksha-logo.png"
          alt="RakshaSafe logo"
          className="size-full rounded-full object-contain"
        />
      </span>
      {withWordmark && (
        <span
          className={cn(
            'font-bold tracking-tight text-ink-900',
            wordmarkSize[size],
          )}
        >
          Raksha<span className="text-gold-500">Safe</span>
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        aria-label="RakshaSafe home"
        className={cn('inline-flex items-center gap-2.5', className)}
      >
        {content}
      </a>
    )
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>{content}</div>
  )
}