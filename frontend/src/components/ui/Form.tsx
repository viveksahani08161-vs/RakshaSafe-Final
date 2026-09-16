import type { FormHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function Form({ title, description, footer, className, children, ...rest }: FormProps) {
  return (
    <form className={cn('space-y-5', className)} noValidate {...rest}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-lg font-bold text-ink-900">{title}</h2>}
          {description && <p className="text-sm text-ink-500">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {footer && <div className="pt-2">{footer}</div>}
    </form>
  )
}