import type { ReactNode } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'

interface ConfirmPurgeModalProps {
  open: boolean
  title: string
  confirmLabel: string
  busy: boolean
  onConfirm: () => void
  onClose: () => void
  children: ReactNode
}

export function ConfirmPurgeModal({
  open,
  title,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
  children,
}: ConfirmPurgeModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2 text-sm">{children}</div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
