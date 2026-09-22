import type { ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  requiredMark?: boolean
}

export function Textarea({
  label,
  hint,
  error,
  requiredMark = false,
  id,
  className,
  ...rest
}: TextareaProps) {
  const fieldId = id ?? rest.name

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-semibold text-ink-800">
          {label}
          {requiredMark && <span className="ml-0.5 text-rose-500 dark:text-rose-400">*</span>}
        </label>
      )}
      <textarea
        id={fieldId}
        className={cn(
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink-900',
          'placeholder:text-ink-400 dark:placeholder:text-ink-500',
          'border-ink-200 shadow-sm transition-colors',
          'focus:border-gold-400 focus:ring-2 focus:ring-gold-300/50 focus:outline-none',
          error
            ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200/60'
            : 'border-ink-200',
          'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}