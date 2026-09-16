import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Logo } from '../ui/Logo'
import { XIcon } from '../ui/icons'
import { Header } from './Header'
import type { NavItem } from './Navbar'
import { Sidebar } from './Sidebar'

export interface AppShellProps {
  items: NavItem[]
  nav?: ReactNode
  actions?: ReactNode
  sidebarFooter?: ReactNode
  notificationCount?: number
  className?: string
  contentClassName?: string
  children: ReactNode
}

export function AppShell({
  items,
  nav,
  actions,
  sidebarFooter,
  notificationCount = 0,
  className,
  contentClassName,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={cn('min-h-svh bg-cream-100', className)}>
      <Header
        notificationCount={notificationCount}
        nav={nav}
        actions={actions}
      />

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-72 shrink-0 border-r border-ink-100 lg:block">
          <Sidebar items={items} heading="Navigation" footer={sidebarFooter} />
        </aside>

        {/* Mobile drawer */}
        <div
          className={cn(
            'fixed inset-0 z-50 lg:hidden',
            mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none',
          )}
        >
          <div
            className={cn(
              'animate-fade-in absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity',
              mobileNavOpen ? 'opacity-100' : 'opacity-0',
            )}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-72 bg-cream-50 shadow-2xl transition-transform duration-200',
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
              <Logo size="sm" />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <Sidebar items={items} heading="Navigation" footer={sidebarFooter} />
          </div>
        </div>

        <main className={cn('min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8', contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  )
}