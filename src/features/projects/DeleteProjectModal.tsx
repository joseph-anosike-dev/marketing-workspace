import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { projectsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import { plural } from '@/lib/format'
import type { Project } from '@/types'

interface DeleteProjectModalProps {
  project: Project | null
  itemCount: number
  onClose: () => void
  onDeleted: () => void
}

export function DeleteProjectModal({
  project,
  itemCount,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  return (
    <Modal open={project !== null} title="Delete project" onClose={onClose}>
      {project && (
        <DeleteForm
          project={project}
          itemCount={itemCount}
          onCancel={onClose}
          onDeleted={onDeleted}
        />
      )}
    </Modal>
  )
}

function DeleteForm({
  project,
  itemCount,
  onCancel,
  onDeleted,
}: {
  project: Project
  itemCount: number
  onCancel: () => void
  onDeleted: () => void
}) {
  const [deleteItems, setDeleteItems] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await projectsRepo.remove(project.id, { deleteItems })
      onDeleted()
    } catch (e) {
      setError(describeError(e))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Delete <strong>{project.name}</strong>?
      </p>

      {itemCount > 0 ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-muted-foreground">
            This project has {plural(itemCount, 'finding')}. What should happen to
            them?
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="delete-mode"
              checked={!deleteItems}
              onChange={() => setDeleteItems(false)}
              className="mt-1 size-4"
            />
            <span>
              <span className="font-medium">Keep them in the Vault</span>
              <br />
              <span className="text-muted-foreground">
                They stay searchable but are no longer part of any project.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="delete-mode"
              checked={deleteItems}
              onChange={() => setDeleteItems(true)}
              className="mt-1 size-4"
            />
            <span>
              <span className="font-medium">Delete them too</span>
              <br />
              <span className="text-muted-foreground">
                They move to Trash and can be restored with the project.
              </span>
            </span>
          </label>
        </fieldset>
      ) : (
        <p className="text-sm text-muted-foreground">
          The project is empty. It moves to Trash, where you can restore it.
        </p>
      )}

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
          Delete project
        </Button>
      </div>
    </div>
  )
}