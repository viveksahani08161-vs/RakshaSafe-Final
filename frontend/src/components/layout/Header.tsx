import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useI18n } from '../../lib/i18n'
import { BellIcon, MenuIcon } from '../ui/icons'
import { Logo } from '../ui/Logo'
import { LanguageSelector } from './LanguageSelector'

export interface HeaderProps {
  nav?: ReactNode
  actions?: ReactNode
  showNotifications?: boolean
  notificationCount?: number
  className?: string
}

export function Header({
  nav,
  actions,
  showNotifications = true,
  notificationCount = 0,
  className,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useI18n()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-ink-200/70 bg-cream-50/90 backdrop-blur-md',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t('aria.toggleMenu')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
          <Logo size="sm" />
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">{nav}</div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>
          {actions}
          {showNotifications && (
            <button
              type="button"
              aria-label={t('nav.notifications')}
              className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100"
            >
              <BellIcon className="size-5" />
              {notificationCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {nav && (
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-200 lg:hidden',
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="border-t border-ink-100 px-4 py-3">
            {nav}
            <div className="mt-3 block sm:hidden">
              <LanguageSelector />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}