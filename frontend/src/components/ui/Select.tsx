import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDownIcon } from './icons'

export interface Option {
  label: string
  value: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  options?: Option[]
  placeholder?: string
  requiredMark?: boolean
}

export function Select({
  label,
  hint,
  error,
  options = [],
  placeholder,
  requiredMark = false,
  id,
  className,
  children,
  ...rest
}: SelectProps) {
  const fieldId = id ?? rest.name

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-semibold text-ink-800">
          {label}
          {requiredMark && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={fieldId}
          className={cn(
            'h-11 w-full cursor-pointer appearance-none rounded-xl border bg-white px-3.5 pr-9 text-sm text-ink-900',
            'border-ink-200 shadow-sm transition-colors',
            'focus:border-gold-400 focus:ring-2 focus:ring-gold-300/50 focus:outline-none',
            error
              ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200/60'
              : 'border-ink-200',
            'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-400">
          <ChevronDownIcon className="size-4" />
        </span>
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}