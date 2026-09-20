import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  leftIcon?: ReactNode
  rightElement?: ReactNode
  requiredMark?: boolean
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightElement,
  requiredMark = false,
  id,
  className,
  'aria-invalid': ariaInvalid,
  ...rest
}: InputProps) {
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
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400 [&>svg]:size-4">
            {leftIcon}
          </span>
        )}
        <input
          id={fieldId}
          aria-invalid={ariaInvalid ?? error ? true : undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900',
            'placeholder:text-ink-400',
            'border-ink-200 shadow-sm transition-colors',
            'focus:border-gold-400 focus:ring-2 focus:ring-gold-300/50 focus:outline-none',
            leftIcon ? 'pl-9' : undefined,
            rightElement ? 'pr-11' : undefined,
            error
              ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200/60'
              : 'border-ink-200',
            'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
            className,
          )}
          {...rest}
        />
        {rightElement && (
          <span className="absolute inset-y-0 right-2 flex items-center [&>button]:rounded-lg [&>button]:p-1.5 [&>button]:text-ink-400 [&>button]:transition-colors [&>button]:hover:text-ink-700 [&>svg]:size-4">
            {rightElement}
          </span>
        )}
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