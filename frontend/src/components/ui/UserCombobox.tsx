import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ApiError, api } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { cn } from '../../lib/cn'
import { ChevronDownIcon, SearchIcon, XIcon } from './icons'
import { Spinner } from './Spinner'

export interface ComboboxUser {
  id: string
  name: string
  email: string
  phone?: string
}

export interface UserComboboxProps {
  onSelect: (user: ComboboxUser) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

interface UsersResponse {
  users: ComboboxUser[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

const PAGE_SIZE = 6

/**
 * Admin user picker. Fetches real users from `/admin/users` (admin-only) — the
 * list loads on focus without typing, filters server-side by name/email/phone/ID
 * as you type, and pages through every registered user with "Load more".
 */
export function UserCombobox({
  onSelect,
  placeholder,
  label,
  disabled = false,
  className,
}: UserComboboxProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const [options, setOptions] = useState<ComboboxUser[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const requestSeq = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  async function fetchUsers(term: string, targetPage: number, append: boolean): Promise<void> {
    requestSeq.current += 1
    const seq = requestSeq.current
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) })
      const trimmed = term.trim()
      if (trimmed !== '') params.set('search', trimmed)
      const res = await api<UsersResponse>(`/admin/users?${params.toString()}`)
      if (!mountedRef.current || requestSeq.current !== seq) return
      const items = (res.users ?? []).map((u) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
      }))
      setOptions((prev) => (append ? [...prev, ...items] : items))
      setPage(res.pagination?.page ?? targetPage)
      setTotalPages(res.pagination?.totalPages ?? 1)
      setTotal(res.pagination?.total ?? items.length)
      setError(null)
    } catch (err) {
      if (!mountedRef.current || requestSeq.current !== seq) return
      setError(err instanceof ApiError ? err.message : t('admin.reports.error.unreachable'))
      if (!append) {
        setOptions([])
        setTotal(0)
        setTotalPages(1)
      }
    } finally {
      if (mountedRef.current && requestSeq.current === seq) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  function handleFocus(): void {
    if (disabled) return
    setTouched(true)
    setOpen(true)
    if (options.length === 0 && !loading) void fetchUsers(query, 1, false)
  }

  function handleQueryChange(value: string): void {
    setQuery(value)
    setOpen(true)
    setTouched(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void fetchUsers(value, 1, false), 250)
  }

  function handleClear(): void {
    setQuery('')
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void fetchUsers('', 1, false)
  }

  function handleSelect(user: ComboboxUser): void {
    onSelect(user)
    setOpen(false)
    setQuery('')
    setOptions([])
    setTouched(false)
    setTotal(0)
    setTotalPages(1)
    setError(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (open && options.length > 0) handleSelect(options[0])
    }
  }

  const showEmpty = open && touched && !loading && !error && options.length === 0
  const showError = open && !loading && error !== null
  const showList = open && !loading && !error && options.length > 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</label>
      )}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-ink-400" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="user-combobox-list"
          aria-autocomplete="list"
          autoComplete="off"
          className={cn(
            'h-11 w-full appearance-none rounded-xl border bg-white pl-10 pr-10 text-sm text-ink-900',
            'placeholder:text-ink-400 dark:placeholder:text-ink-500',
            'border-ink-200 shadow-sm transition-colors',
            'focus:border-gold-400 focus:ring-2 focus:ring-gold-300/50 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-ink-50',
          )}
          placeholder={placeholder ?? t('admin.reports.generate.userSearchPlaceholder')}
          value={query}
          disabled={disabled}
          onFocus={handleFocus}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="absolute inset-y-0 right-3 flex items-center text-ink-400">
          {loading ? (
            <Spinner size="sm" />
          ) : query !== '' ? (
            <button
              type="button"
              aria-label={t('common.search')}
              onClick={handleClear}
              className="flex size-5 items-center justify-center rounded-full bg-ink-200 text-ink-600 transition-colors hover:bg-ink-300"
            >
              <XIcon className="size-3" />
            </button>
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </span>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
          <div id="user-combobox-list" role="listbox" className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-ink-500">
                <Spinner size="sm" />
                <span>{t('admin.reports.generate.loadingUsers')}</span>
              </div>
            )}

            {showError && (
              <div className="px-4 py-4 text-sm">
                <p className="font-medium text-rose-600 dark:text-rose-400" role="alert">
                  {error}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-gold-700 hover:underline"
                  onClick={() => void fetchUsers(query, 1, false)}
                >
                  {t('common.tryAgain')}
                </button>
              </div>
            )}

            {showEmpty && (
              <p className="px-4 py-6 text-center text-sm text-ink-500">
                {t('admin.reports.generate.noUsers')}
              </p>
            )}

            {showList && (
              <ul className="divide-y divide-ink-100">
                {options.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelect(u)}
                      className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-cream-50"
                    >
                      <span className="block truncate text-sm font-bold text-ink-900" title={u.name}>
                        {u.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-500" title={u.email}>
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showList && (
            <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-cream-50/60 px-4 py-2">
              <span className="text-[11px] font-medium text-ink-500">
                {t('admin.reports.generate.showingUsers', { shown: options.length, total })}
              </span>
              {page < totalPages && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void fetchUsers(query, page + 1, true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-700 hover:underline disabled:opacity-60"
                >
                  {loadingMore && <Spinner size="sm" />}
                  {t('admin.reports.generate.loadMore')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
