import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { ToastContext, type NotifyOptions, type ToastData, type ToastVariant } from './toast-context'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  XCircleIcon,
  XIcon,
} from './icons'

const variantStyles: Record<ToastVariant, { icon: string; ring: string }> = {
  info: { icon: 'text-sky-600 dark:text-sky-400', ring: 'border-sky-200 dark:border-sky-800' },
  success: { icon: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-200 dark:border-emerald-800' },
  warning: { icon: 'text-amber-600 dark:text-amber-400', ring: 'border-amber-200 dark:border-amber-800' },
  danger: { icon: 'text-rose-600 dark:text-rose-400', ring: 'border-rose-200 dark:border-rose-800' },
}

const toastIcons = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  danger: XCircleIcon,
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastData
  onDismiss: (id: number) => void
}) {
  const Icon = toastIcons[toast.variant]
  const s = variantStyles[toast.variant]

  return (
    <div
      role="status"
      className={cn(
        'animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-lg shadow-ink-900/10',
        s.ring,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', s.icon)} />
      <div className="min-w-0 flex-1">
        {toast.title && (
          <p className="text-sm font-bold text-ink-900">{toast.title}</p>
        )}
        {toast.description && (
          <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (options: NotifyOptions) => {
      const id = ++counter.current
      const variant = options.variant ?? 'info'
      setToasts((prev) => [...prev, { id, ...options, variant }])
      const duration = options.duration ?? 5000
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}