import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { SearchIcon, XIcon } from './icons'

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  label?: string
}

export function SearchInput({ onClear, label, id, className, ...rest }: SearchInputProps) {
  const fieldId = id ?? 'raksha-search'
  const hasClear = Boolean(onClear) && rest.type !== 'hidden'

  return (
    <div className="relative w-full">
      <SearchIcon className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-ink-400" />
      <input
        id={fieldId}
        type="search"
        aria-label={label ?? 'Search'}
        className={cn(
          'h-11 w-full appearance-none rounded-xl border bg-white pl-10 pr-4 text-sm text-ink-900',
          'placeholder:text-ink-400',
          'border-ink-200 shadow-sm transition-colors',
          'focus:border-gold-400 focus:ring-2 focus:ring-gold-300/50 focus:outline-none',
          className,
        )}
        {...rest}
      />
      {hasClear && rest.value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="absolute inset-y-0 right-3 my-auto flex size-5 items-center justify-center rounded-full bg-ink-200 text-ink-600 transition-colors hover:bg-ink-300"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  )
}