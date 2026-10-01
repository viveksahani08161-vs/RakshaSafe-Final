import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useI18n, type DictKey } from '../../lib/i18n'
import { useTheme } from '../../lib/useTheme'
import { AuthBrand } from '../auth/AuthBrand'
import { MenuIcon, MoonIcon, SunIcon, XIcon } from '../ui/icons'
import { LanguageSelector } from './LanguageSelector'

export interface LandingNavItem {
  /** Dictionary key for the visible label. */
  label: DictKey
  /** id of the in-page section this item scrolls to. */
  section: string
  icon: ReactNode
}

export interface LandingNavProps {
  items: LandingNavItem[]
  className?: string
  /**
   * Optional handler. The landing/login screen shows its content in dialogs
   * rather than as separate sections, so it passes this to receive the chosen
   * item. When it is absent the navbar keeps its original behaviour and simply
   * smooth-scrolls to the item's section.
   */
  onSelect?: (item: LandingNavItem) => void
}

/**
 * Public marketing navbar for the landing/login screen. It is deliberately
 * separate from the authenticated <Header>: this one only exists while no user
 * is signed in and scrolls between sections of the landing page instead of
 * changing routes.
 */
export function LandingNav({ items, className, onSelect }: LandingNavProps) {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)
  // Tracked by label rather than section: several items intentionally share the
  // same scroll target (the footer holds legal/support/contact information), so
  // the section id cannot be used as a unique identity.
  const [activeKey, setActiveKey] = useState<string>(items[0]?.label ?? '')

  function goTo(item: LandingNavItem | undefined): void {
    if (!item) return
    setActiveKey(item.label)
    setOpen(false)
    if (onSelect) {
      onSelect(item)
      return
    }
    const target = document.getElementById(item.section)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-ink-200/70 bg-cream-50/95 backdrop-blur-md',
        className,
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand — the official RakshaSafe logo is reused as-is.
            `min-w-0` (not `shrink-0`) so the brand can shrink on narrow phones,
            otherwise the theme and menu buttons are pushed off the viewport. */}
        <button
          type="button"
          onClick={() => goTo(items[0])}
          className="flex min-w-0 shrink items-center gap-2.5 rounded-xl text-left"
        >
          <span className="[&_img]:h-10 [&_img]:max-w-[6.5rem] sm:[&_img]:h-12 sm:[&_img]:max-w-[8.5rem]">
            <AuthBrand size="sm" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-extrabold leading-tight tracking-tight text-ink-950">
              Raksha<span className="text-gold-600">Safe</span>
            </span>
            <span className="block truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-ink-500">
              {t('landing.brand.subtitle')}
            </span>
          </span>
        </button>

        {/* Desktop navigation */}
        <nav aria-label={t('landing.nav.label')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = activeKey === item.label
              return (
                <li key={item.label}>
                  <a
                    href={`#${item.section}`}
                    onClick={(event) => {
                      event.preventDefault()
                      goTo(item)
                    }}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500',
                      active
                        ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/25'
                        : 'text-ink-600 hover:bg-gold-100 hover:text-gold-800',
                    )}
                  >
                    <span aria-hidden="true" className="[&>svg]:size-4">
                      {item.icon}
                    </span>
                    {t(item.label)}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? t('theme.toggleToLight') : t('theme.toggleToDark')}
            title={isDark ? t('theme.toggleToLight') : t('theme.toggleToDark')}
            aria-pressed={isDark}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-ink-200 bg-white/70 text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-700"
          >
            {isDark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
          </button>
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={t('aria.toggleMenu')}
            aria-expanded={open}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-ink-200 bg-white/70 text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-700 lg:hidden"
          >
            {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet navigation */}
      <div
        className={cn(
          'overflow-hidden border-t border-ink-100 transition-[max-height,opacity] duration-200 lg:hidden',
          open ? 'max-h-[26rem] opacity-100' : 'max-h-0 border-t-transparent opacity-0',
        )}
      >
        <nav aria-label={t('landing.nav.label')} className="px-4 py-3 sm:px-6">
          <ul className="grid gap-1">
            {items.map((item) => {
              const active = activeKey === item.label
              return (
                <li key={item.label}>
                  <a
                    href={`#${item.section}`}
                    onClick={(event) => {
                      event.preventDefault()
                      goTo(item)
                    }}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'inline-flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/25'
                        : 'text-ink-700 hover:bg-gold-100 hover:text-gold-800',
                    )}
                  >
                    <span aria-hidden="true" className="[&>svg]:size-4">
                      {item.icon}
                    </span>
                    {t(item.label)}
                  </a>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 sm:hidden">
            <LanguageSelector />
          </div>
        </nav>
      </div>
    </header>
  )
}
