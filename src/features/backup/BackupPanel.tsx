import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  BackupError,
  buildBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
} from '@/lib/backup'
import { downloadTextFile } from '@/lib/download'

const MAX_BACKUP_BYTES = 25 * 1024 * 1024

interface BackupPanelProps {
  onRestored: () => void
}

export function BackupPanel({ onRestored }: BackupPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setMessage(null)
    setError(null)
    try {
      const backup = await buildBackup()
      const date = backup.exported_at.slice(0, 10)
      downloadTextFile(
        `marketing-workspace-backup-${date}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      )
      const s = summarizeBackup(backup)
      setMessage(
        `Backup downloaded: ${s.projects} projects, ${s.items} items, ${s.tags} tags.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleFile(file: File) {
    setMessage(null)
    setError(null)

    if (file.size > MAX_BACKUP_BYTES) {
      setError('This file is too large to be a backup (limit 25 MB).')
      return
    }

    try {
      const backup = parseBackup(await file.text())
      const s = summarizeBackup(backup)
      const confirmed = window.confirm(
        `Replace ALL current data with this backup?\n\n` +
          `Backup made: ${backup.exported_at}\n` +
          `${s.projects} projects, ${s.items} items, ${s.tags} tags, ${s.bookmarks} bookmarks.\n\n` +
          `This cannot be undone. Tip: download a fresh backup first.`,
      )
      if (!confirmed) return

      await restoreBackup(backup)
      setMessage('Backup restored.')
      onRestored()
    } catch (e) {
      setError(
        e instanceof BackupError
          ? e.message
          : `Restore failed: ${e instanceof Error ? e.message : String(e)}. Your existing data was not changed.`,
      )
    }
  }

  return (
    <section className="mt-6 space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">5. Backup and restore</h2>
      <p className="text-sm text-muted-foreground">
        Your data lives only in this browser. Download a backup regularly and keep
        the file somewhere safe.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleExport()}>
          Download backup
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInput.current?.click()}
        >
          Restore from file…
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Choose a backup file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // lets you pick the same file again later
            if (file) void handleFile(file)
          }}
        />
      </div>

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
    </section>
  )
}