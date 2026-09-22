import { useState } from 'react'
import { cn } from '../../lib/cn'

/**
 * Official RakshaSafe logo used on the authentication pages.
 * Served from the public asset folder (/assets/raksha_logo.png) exactly as
 * provided - never regenerated or substituted. A graceful fallback keeps the
 * tile intact if the asset is ever missing from a deployed build.
 */
const PRIMARY_SRC = '/assets/raksha_logo.png'
const FALLBACK_SRC = '/assets/raksha-logo.png'
const DEFAULT_ALT = 'RakshaSafe — Women Safety & Disaster Emergency Response'

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
  const [src, setSrc] = useState(PRIMARY_SRC)
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'object-contain',
        sizeClasses[size],
        className,
      )}
      onError={() => setSrc((current) => (current === PRIMARY_SRC ? FALLBACK_SRC : current))}
    />
  )
}