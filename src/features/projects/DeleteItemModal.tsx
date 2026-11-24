import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { itemsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import type { ResearchItemView } from '@/types'

interface DeleteItemModalProps {
  item: ResearchItemView | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteItemModal({ item, onClose, onDeleted }: DeleteItemModalProps) {
  return (
    <Modal open={item !== null} title="Delete finding" onClose={onClose}>
      {item && <DeleteForm item={item} onCancel={onClose} onDeleted={onDeleted} />}
    </Modal>
  )
}

function DeleteForm({
  item,
  onCancel,
  onDeleted,
}: {
  item: ResearchItemView
  onCancel: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await itemsRepo.remove(item.id)
      onDeleted()
    } catch (e) {
      setError(describeError(e))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Delete <strong className="break-words">{item.title}</strong>?
      </p>
      <p className="text-sm text-muted-foreground">
        It will disappear from this project, the Vault and search. You can restore it
        from Settings → Trash.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => void confirm()}
        >
          Delete finding
        </Button>
      </div>
    </div>
  )
}