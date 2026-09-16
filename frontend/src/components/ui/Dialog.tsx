import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { AlertTriangleIcon } from './icons'
import { Modal, type ModalProps } from './Modal'

export type DialogVariant = 'default' | 'danger'

export interface DialogProps extends Omit<ModalProps, 'size'> {
  variant?: DialogVariant
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  onConfirm?: () => void
  confirmDisabled?: boolean
  confirmLoading?: boolean
  cancelButton?: ReactNode
}

export function Dialog({
  variant = 'default',
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  confirmLoading = false,
  onClose,
  cancelButton,
  ...modalProps
}: DialogProps) {
  const isDanger = variant === 'danger'

  return (
    <Modal
      size="sm"
      onClose={onClose}
      {...modalProps}
      footer={
        <>
          {cancelButton ?? (
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-ink-300 bg-white px-5 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
            >
              {cancelLabel}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              disabled={confirmDisabled || confirmLoading}
              onClick={onConfirm}
              className={cn(
                'h-11 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                isDanger
                  ? 'bg-rose-600 shadow-rose-600/25 hover:bg-rose-700'
                  : 'bg-gold-500 shadow-gold-500/25 hover:bg-gold-600',
              )}
            >
              {confirmLoading ? 'Please wait…' : confirmLabel}
            </button>
          )}
        </>
      }
    >
      <div
        className={cn(
          'flex gap-4 rounded-xl border p-4',
          isDanger ? 'border-rose-200 bg-rose-50' : 'border-gold-200 bg-gold-50',
        )}
      >
        {isDanger ? (
          <AlertTriangleIcon
            className="mt-0.5 size-5 shrink-0 text-rose-600"
            aria-hidden
          />
        ) : (
          <AlertTriangleIcon
            className="mt-0.5 size-5 shrink-0 text-gold-600"
            aria-hidden
          />
        )}
        <p className="text-sm leading-relaxed text-ink-700">{modalProps.children}</p>
      </div>
    </Modal>
  )
}