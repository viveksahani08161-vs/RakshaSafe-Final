import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export function Table({ className, children, ...rest }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-ink-200/70 bg-white shadow-sm shadow-ink-900/5">
      <table
        className={cn('w-full min-w-0 border-collapse text-left text-sm', className)}
        {...rest}
      >
        {children}
      </table>
    </div>
  )
}

export function TableHead({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-cream-200/60', className)} {...rest}>
      {children}
    </thead>
  )
}

export function TableBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-ink-100', className)} {...rest}>
      {children}
    </tbody>
  )
}

export function TableRow({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-gold-50/50',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  )
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  dense?: boolean
}

export function TableHeaderCell({ dense, className, children, ...rest }: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap text-xs font-bold uppercase tracking-wider text-ink-500',
        dense ? 'px-3 py-2' : 'px-4 py-3',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  dense?: boolean
}

export function TableCell({ dense, className, children, ...rest }: TableCellProps) {
  return (
    <td
      className={cn(
        'align-middle text-ink-800',
        dense ? 'px-3 py-2' : 'px-4 py-3.5',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  )
}