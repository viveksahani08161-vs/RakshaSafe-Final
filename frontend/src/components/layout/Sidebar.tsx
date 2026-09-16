import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { NavItem } from './Navbar'

export interface SidebarProps {
  items: NavItem[]
  heading?: ReactNode
  footer?: ReactNode
  label?: string
  className?: string
}

export function Sidebar({ items, heading, footer, label = 'Sidebar', className }: SidebarProps) {
  return (
    <aside
      aria-label={label}
      className={cn('flex h-full w-72 flex-col bg-cream-50', className)}
    >
      {heading && (
        <div className="border-b border-ink-100 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400">{heading}</p>
        </div>
      )}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Tag = item.href ? 'a' : 'div'
          return (
            <Tag
              key={`${item.href}-${item.label}`}
              {...(item.href ? { href: item.href } : {})}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                item.active
                  ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/25'
                  : 'text-ink-600 hover:bg-gold-100 hover:text-gold-800',
              )}
            >
              {item.icon && <span className="[&>svg]:size-5">{item.icon}</span>}
              {item.label}
            </Tag>
          )
        })}
      </nav>
      {footer && <div className="border-t border-ink-100 p-3">{footer}</div>}
    </aside>
  )
}