import { cn } from '../../lib/cn'

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

/** Branding variant is kept for API compatibility; all variants use the golden logo. */
export type LogoVariant = 'user' | 'admin' | 'auto'

export interface LogoProps {
  size?: LogoSize
  variant?: LogoVariant
  withWordmark?: boolean
  href?: string
  className?: string
}

const GOLDEN_SRC = '/assets/raksha-logo.png'
const GOLDEN_ALT = 'RakshaSafe logo'

const heightClasses: Record<LogoSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
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
      <img
        src={GOLDEN_SRC}
        alt={GOLDEN_ALT}
        className={cn('w-auto max-w-[12rem] object-contain', heightClasses[size])}
      />
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