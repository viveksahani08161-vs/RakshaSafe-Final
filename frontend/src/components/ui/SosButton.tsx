import type { ButtonHTMLAttributes } from 'react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'
import { useI18n } from '../../lib/i18n'
import { AlertTriangleIcon } from './icons'

export type SosButtonSize = 'sm' | 'md' | 'lg' | 'xl'

export interface SosButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: SosButtonSize
  pulse?: boolean
  label?: string
  /** Show hold-to-confirm interaction */
  holdToConfirm?: boolean
  /** Hold duration in milliseconds */
  holdDuration?: number
  /** Callback when hold is confirmed */
  onHoldConfirm?: () => void
}

const sizeClasses: Record<SosButtonSize, string> = {
  sm: 'size-14 text-base',
  md: 'size-20 text-xl',
  lg: 'size-28 text-3xl',
  xl: 'size-36 text-4xl',
}

export function SosButton({
  size = 'lg',
  pulse = true,
  label = 'SOS',
  className,
  type = 'button',
  holdToConfirm = false,
  holdDuration = 1500,
  onHoldConfirm,
  ...rest
}: SosButtonProps) {
  const { t } = useI18n()
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startHold = () => {
    if (!holdToConfirm) return
    setIsHolding(true)
    setHoldProgress(0)
    
    progressTimerRef.current = setInterval(() => {
      setHoldProgress(prev => Math.min(prev + 100 / holdDuration * 100, 100))
    }, 100)

    holdTimerRef.current = setTimeout(() => {
      setIsHolding(false)
      setHoldProgress(0)
      onHoldConfirm?.()
    }, holdDuration)
  }

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
    setIsHolding(false)
    setHoldProgress(0)
  }

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  return (
    <div className="relative inline-flex select-none">
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
        onMouseDown={e => { startHold(); (rest as any).onMouseDown?.(e) }}
        onMouseUp={e => { cancelHold(); (rest as any).onMouseUp?.(e) }}
        onMouseLeave={e => { cancelHold(); (rest as any).onMouseLeave?.(e) }}
        onTouchStart={e => { startHold(); (rest as any).onTouchStart?.(e) }}
        onTouchEnd={e => { cancelHold(); (rest as any).onTouchEnd?.(e) }}
        onTouchCancel={e => { cancelHold(); (rest as any).onTouchCancel?.(e) }}
        disabled={isHolding}
      >
        <span className="flex items-center gap-2 relative z-10">
          <AlertTriangleIcon className="size-[0.8em]" />
          {label}
        </span>
        {holdToConfirm && (
          <div className="absolute inset-0 rounded-full bg-gold-600/20" style={{ clipPath: `inset(0 0 ${100 - holdProgress}% 0)` }} />
        )}
      </button>
      {holdToConfirm && isHolding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 text-white dark:text-ink-950 px-4 py-2 rounded-xl text-sm font-medium text-center">
            {t('sos.buttonHold')}
          </div>
        </div>
      )}
    </div>
  )
}