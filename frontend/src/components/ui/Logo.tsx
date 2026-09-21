import { useContext, useState } from 'react'
import { cn } from '../../lib/cn'
import { AuthContext, type UserRole } from '../../lib/auth-context'

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

/** Role-aware branding: auto derives the variant from the authenticated role. */
export type LogoVariant = 'user' | 'admin' | 'auto'

export interface LogoProps {
  size?: LogoSize
  variant?: LogoVariant
  withWordmark?: boolean
  href?: string
  className?: string
}

const VARIANT_SRC: Record<Exclude<LogoVariant, 'auto'>, string> = {
  user: '/assets/raksha-logo-user.png',
  admin: '/assets/raksha-logo-admin.png',
}

const VARIANT_ALT: Record<Exclude<LogoVariant, 'auto'>, string> = {
  user: 'RakshaSafe user logo',
  admin: 'RakshaSafe admin logo',
}

/** Existing single-asset logo, kept as the responder / fallback branding. */
const LEGACY_SRC = '/assets/raksha-logo.png'
const LEGACY_ALT = 'RakshaSafe logo'

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

function resolveVariant(variant: LogoVariant, role: UserRole | undefined): Exclude<LogoVariant, 'auto'> {
  if (variant !== 'auto') return variant
  return role === 'ADMIN' ? 'admin' : 'user'
}

export function Logo({ size = 'md', variant = 'auto', withWordmark = true, href, className }: LogoProps) {
  const auth = useContext(AuthContext)
  const resolved = resolveVariant(variant, auth?.user?.role)

  // Responder keeps the existing single-asset branding; USER/ADMIN use the
  // provided blue/gold variants, falling back to the legacy logo if absent.
  const usesLegacy = variant === 'auto' && auth?.user?.role === 'RESPONDER'
  const chain = usesLegacy
    ? [{ src: LEGACY_SRC, alt: LEGACY_ALT }]
    : [
        { src: VARIANT_SRC[resolved], alt: VARIANT_ALT[resolved] },
        { src: LEGACY_SRC, alt: LEGACY_ALT },
      ]

  const primarySrc = chain[0].src
  const [failState, setFailState] = useState({ src: primarySrc, count: 0 })
  const fail = failState.src === primarySrc ? failState : { src: primarySrc, count: 0 }

  const index = Math.min(fail.count, chain.length - 1)
  const current = chain[index]
  const hideImage = fail.count >= chain.length

  const content = (
    <>
      {!hideImage && current && (
        <img
          src={current.src}
          alt={current.alt}
          className={cn('w-auto max-w-[12rem] object-contain', heightClasses[size])}
          onError={() => setFailState({ src: primarySrc, count: fail.count + 1 })}
        />
      )}
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