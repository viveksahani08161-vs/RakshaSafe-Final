import { cn } from '../../lib/cn'

/**
 * Official RakshaSafe golden logo used on the authentication pages.
 * Served from the public asset folder (/assets/raksha-logo.png) exactly as
 * provided - never regenerated or substituted.
 */
const PRIMARY_SRC = '/assets/raksha-logo.png'
const DEFAULT_ALT = 'RakshaSafe — Women Safety & Disaster Management System'

export type AuthBrandSize = 'sm' | 'md' | 'lg' | 'hero'

export interface AuthBrandProps {
  size?: AuthBrandSize
  alt?: string
  className?: string
}

const sizeClasses: Record<AuthBrandSize, string> = {
  sm: 'h-12 w-auto max-w-[9rem]',
  md: 'h-16 w-auto max-w-[13rem]',
  lg: 'h-24 w-auto max-w-[18rem]',
  hero: 'h-auto w-full max-w-[40rem]',
}

export function AuthBrand({ size = 'md', alt = DEFAULT_ALT, className }: AuthBrandProps) {
  return (
    <img
      src={PRIMARY_SRC}
      alt={alt}
      className={cn(
        'object-contain',
        sizeClasses[size],
        className,
      )}
    />
  )
}