import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { tagsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import { plural } from '@/lib/format'
import type { TagWithCount } from '@/types'

export interface TagChange {
  from: string
  /** The new name, or null if the tag was removed. */
  to: string | null
}

interface TagManagerModalProps {
  open: boolean
  tags: TagWithCount[]
  onClose: () => void
  onChanged: (change: TagChange) => void
}

export function TagManagerModal({
  open,
  tags,
  onClose,
  onChanged,
}: TagManagerModalProps) {
  return (
    <Modal open={open} title="Manage tags" onClose={onClose}>
      <TagManager tags={tags} onClose={onClose} onChanged={onChanged} />
    </Modal>
  )
}

function TagManager({
  tags,
  onClose,
  onChanged,
}: Omit<TagManagerModalProps, 'open'>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function startRename(tag: TagWithCount) {
    setEditingId(tag.id)
    setRemovingId(null)
    setDraft(tag.name)
    setError(null)
    setMessage(null)
  }

  function startRemove(tag: TagWithCount) {
    setRemovingId(tag.id)
    setEditingId(null)
    setError(null)
    setMessage(null)
  }

  function cancel() {
    setEditingId(null)
    setRemovingId(null)
    setError(null)
  }

  async function rename(tag: TagWithCount, event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await tagsRepo.rename(tag.id, draft)
      if (result.name === tag.name) {
        setMessage('No change.')
      } else if (result.merged) {
        setMessage(`Merged #${tag.name} into #${result.name}.`)
      } else {
        setMessage(`Renamed #${tag.name} to #${result.name}.`)
      }
      setEditingId(null)
      onChanged({ from: tag.name, to: result.name })
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(tag: TagWithCount) {
    setBusy(true)
    setError(null)
    try {
      await tagsRepo.remove(tag.id)
      setMessage(`Removed #${tag.name}.`)
      setRemovingId(null)
      onChanged({ from: tag.name, to: null })
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Renaming a tag to the name of another tag merges them. Removing a tag only
        takes it off your findings. The findings are kept.
      </p>

      {message && (
        <p role="status" className="rounded-md border bg-muted/50 p-2 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {tags.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No tags yet. Tags you add to findings will appear here.
        </p>
      ) : (
        <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
          {tags.map((tag) => (
            <li key={tag.id} className="p-3">
              {editingId === tag.id ? (
                <form
                  onSubmit={(event) => void rename(tag, event)}
                  className="space-y-2"
                >
                  <label htmlFor="tag-rename" className="text-sm font-medium">
                    New name for #{tag.name}
                  </label>
                  <input
                    id="tag-rename"
                    autoFocus
                    value={draft}
                    maxLength={60}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={cancel}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                      Save
                    </Button>
                  </div>
                </form>
              ) : removingId === tag.id ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Remove <strong>#{tag.name}</strong> from{' '}
                    {plural(tag.count, 'finding')}? The findings are kept.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={cancel}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void remove(tag)}
                    >
                      Remove tag
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words">#{tag.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plural(tag.count, 'finding')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 md:h-8"
                      aria-label={`Rename ${tag.name}`}
                      onClick={() => startRename(tag)}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 md:h-8"
                      aria-label={`Remove ${tag.name}`}
                      onClick={() => startRemove(tag)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}