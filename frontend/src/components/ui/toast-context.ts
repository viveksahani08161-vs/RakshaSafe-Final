import { createContext, useContext, type ReactNode } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface ToastData {
  id: number
  title?: ReactNode
  description?: ReactNode
  variant: ToastVariant
}

export interface NotifyOptions {
  title?: ReactNode
  description?: ReactNode
  variant?: ToastVariant
  duration?: number
}

export interface ToastApi {
  notify: (options: NotifyOptions) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return ctx
}