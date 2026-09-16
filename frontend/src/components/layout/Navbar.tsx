import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface NavItem {
  label: string
  href: string
  icon?: ReactNode
  active?: boolean
}

export interface NavbarProps {
  items: NavItem[]
  className?: string
}

export function Navbar({ items, className }: NavbarProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className={cn(
        '-mx-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <ul className="flex min-w-max items-center gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                item.active
                  ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/25'
                  : 'text-ink-600 hover:bg-gold-100 hover:text-gold-800',
              )}
            >
              {item.icon && <span className="[&>svg]:size-4">{item.icon}</span>}
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}