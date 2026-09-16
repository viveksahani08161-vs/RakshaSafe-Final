import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CheckIcon } from './icons'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  hint?: ReactNode
}

export function Checkbox({ label, hint, id, className, ...rest }: CheckboxProps) {
  const fieldId = id ?? rest.name

  return (
    <div className="space-y-1">
      <label
        htmlFor={fieldId}
        className={cn('group inline-flex cursor-pointer items-start gap-2.5', className)}
      >
        <span className="relative mt-0.5 inline-flex size-5 shrink-0 items-center justify-center">
          <input
            id={fieldId}
            type="checkbox"
            className="peer size-5 cursor-pointer appearance-none rounded-md border border-ink-300 bg-white shadow-sm transition-colors checked:border-gold-500 checked:bg-gold-500 hover:border-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:cursor-not-allowed disabled:bg-ink-50"
            {...rest}
          />
          <CheckIcon className="pointer-events-none absolute size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
        {label && (
          <span className="select-none text-sm text-ink-800">{label}</span>
        )}
      </label>
      {hint && <p className="pl-7 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}