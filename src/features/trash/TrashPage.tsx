import { RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { trashRepo } from '@/data/repositories'
import type {
  TrashContents,
  TrashedItem,
  TrashedProject,
} from '@/data/repositories/trash-types'
import { describeError } from '@/lib/describeError'
import { formatDate, plural } from '@/lib/format'
import { formatBytes } from '@/lib/images'
import { SECTION_LABELS } from '@/types'
import { ConfirmPurgeModal } from './ConfirmPurgeModal'

type Pending =
  | { kind: 'item'; row: TrashedItem }
  | { kind: 'project'; row: TrashedProject }
  | { kind: 'all' }

function imageText(count: number, bytes: number): string | null {
  return count > 0 ? `${plural(count, 'image')} (${formatBytes(bytes)})` : null
}

export function TrashPage() {
  const [contents, setContents] = useState<TrashContents | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    trashRepo
      .list()
      .then((result) => {
        if (!cancelled) setContents(result)
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(describeError(e))
      })
    return () => {
      cancelled = true
    }
  }, [version])

  async function act(run: () => Promise<string>) {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      setMessage(await run())
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
      setVersion((v) => v + 1)
    }
  }

  function restoreItem(row: TrashedItem) {
    void act(async () => {
      const { movedToVault } = await trashRepo.restoreItem(row.item.id)
      return movedToVault
        ? `Restored “${row.item.title}” to the Vault, because its project is in Trash or gone.`
        : `Restored “${row.item.title}”.`
    })
  }

  function restoreProject(row: TrashedProject) {
    void act(async () => {
      const { restoredItems } = await trashRepo.restoreProject(row.project.id)
      return restoredItems > 0
        ? `Restored “${row.project.name}” with ${plural(restoredItems, 'finding')}.`
        : `Restored “${row.project.name}”.`
    })
  }

  function confirmPurge() {
    const target = pending
    setPending(null)
    if (!target) return
    void act(async () => {
      if (target.kind === 'item') {
        await trashRepo.purgeItem(target.row.item.id)
        return `Permanently deleted “${target.row.item.title}”.`
      }
      if (target.kind === 'project') {
        await trashRepo.purgeProject(target.row.project.id)
        return `Permanently deleted “${target.row.project.name}”.`
      }
      const { projects, items } = await trashRepo.empty()
      return `Trash emptied: ${plural(projects, 'project')} and ${plural(items, 'finding')} deleted for good.`
    })
  }

  const isEmpty =
    contents !== null && contents.projects.length === 0 && contents.items.length === 0
  const totalImages = contents ? imageText(contents.imageCount, contents.imageBytes) : null

  return (
    <>
      <PageHeader
        title="Trash"
        description="Deleted projects and findings wait here until you delete them for good. Their images still use storage until then."
      />

      <div className="max-w-3xl space-y-6">
        {message && (
          <p role="status" className="text-sm text-green-700">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {loadError && (
          <p role="alert" className="text-sm text-red-700">
            Could not load Trash: {loadError}
          </p>
        )}
        {!contents && !loadError && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {isEmpty && (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Trash is empty.
          </p>
        )}

        {contents && !isEmpty && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {plural(contents.projects.length, 'project')},{' '}
                {plural(contents.items.length, 'single finding')}
                {totalImages ? ` · ${totalImages} in Trash` : ''}
              </p>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setPending({ kind: 'all' })}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Empty Trash
              </Button>
            </div>

            {contents.projects.length > 0 && (
              <section aria-labelledby="trash-projects" className="space-y-2">
                <h2 id="trash-projects" className="font-semibold">
                  Projects
                </h2>
                <ul className="space-y-2">
                  {contents.projects.map((row) => (
                    <TrashRow
                      key={row.project.id}
                      title={row.project.name}
                      meta={[
                        `Deleted ${formatDate(row.project.deleted_at ?? row.project.updated_at)}`,
                        row.itemCount > 0
                          ? `with ${plural(row.itemCount, 'finding')}`
                          : 'empty when deleted',
                        imageText(row.imageCount, row.imageBytes),
                      ]}
                      busy={busy}
                      onRestore={() => restoreProject(row)}
                      onPurge={() => setPending({ kind: 'project', row })}
                    />
                  ))}
                </ul>
              </section>
            )}

            {contents.items.length > 0 && (
              <section aria-labelledby="trash-items" className="space-y-2">
                <h2 id="trash-items" className="font-semibold">
                  Findings
                </h2>
                <ul className="space-y-2">
                  {contents.items.map((row) => (
                    <TrashRow
                      key={row.item.id}
                      title={row.item.title}
                      meta={[
                        SECTION_LABELS[row.item.section],
                        `Deleted ${formatDate(row.item.deleted_at ?? row.item.updated_at)}`,
                        row.projectName
                          ? row.projectInTrash
                            ? `From “${row.projectName}” (in Trash, will restore to the Vault)`
                            : `From “${row.projectName}”`
                          : null,
                        imageText(row.imageCount, row.imageBytes),
                      ]}
                      busy={busy}
                      onRestore={() => restoreItem(row)}
                      onPurge={() => setPending({ kind: 'item', row })}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmPurgeModal
        open={pending !== null}
        title={pending?.kind === 'all' ? 'Empty Trash' : 'Delete permanently'}
        confirmLabel={pending?.kind === 'all' ? 'Empty Trash' : 'Delete permanently'}
        busy={busy}
        onConfirm={confirmPurge}
        onClose={() => setPending(null)}
      >
        {pending?.kind === 'item' && (
          <p>
            Permanently delete <strong className="break-words">{pending.row.item.title}</strong>
            ? Its images and tag links go with it.
          </p>
        )}
        {pending?.kind === 'project' && (
          <p>
            Permanently delete <strong className="break-words">{pending.row.project.name}</strong>
            {pending.row.itemCount > 0
              ? ` and the ${plural(pending.row.itemCount, 'finding')} deleted with it`
              : ''}
            ?
          </p>
        )}
        {pending?.kind === 'all' && contents && (
          <p>
            Permanently delete {plural(contents.projects.length, 'project')} and{' '}
            {plural(contents.items.length, 'finding')}, with all their images?
          </p>
        )}
        <p className="text-muted-foreground">
          This cannot be undone. Restoring a backup is the only way back.
        </p>
      </ConfirmPurgeModal>
    </>
  )
}

function TrashRow({
  title,
  meta,
  busy,
  onRestore,
  onPurge,
}: {
  title: string
  meta: (string | null)[]
  busy: boolean
  onRestore: () => void
  onPurge: () => void
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{title}</p>
        <p className="text-sm text-muted-foreground">
          {meta.filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRestore}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Restore
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onPurge}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete permanently
        </Button>
      </div>
    </li>
  )
}
