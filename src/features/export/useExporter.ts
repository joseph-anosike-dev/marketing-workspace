import { useCallback, useRef, useState } from 'react'
import { describeError } from '@/lib/describeError'
import { downloadBinaryFile } from '@/lib/download'
import { plural } from '@/lib/format'
import type { ExportResult } from './bundle'

/** "Exported 12 findings and 5 images as research-vault-2026-11-24.zip." */
export function describeExport(result: ExportResult): string {
  const counts = [plural(result.findingCount, 'finding')]
  if (result.imageCount > 0) counts.push(plural(result.imageCount, 'image'))
  return `Exported ${counts.join(' and ')} as ${result.file.fileName}.`
}

/**
 * Shared by every page that exports. Runs one export at a time, starts the
 * download, and keeps the message, any warnings and any error to show.
 */
export function useExporter() {
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  const run = useCallback(
    async (key: string, task: () => Promise<ExportResult>) => {
      if (running.current) return
      running.current = true
      setBusyKey(key)
      setNotice(null)
      setWarnings([])
      setError(null)
      try {
        // Let the "Exporting…" label appear before the heavy work starts.
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        const result = await task()
        downloadBinaryFile(result.file.fileName, result.file.bytes, result.file.mimeType)
        setNotice(describeExport(result))
        setWarnings(result.warnings)
      } catch (e) {
        setError(describeError(e))
      } finally {
        running.current = false
        setBusyKey(null)
      }
    },
    [],
  )

  const dismiss = useCallback(() => {
    setNotice(null)
    setWarnings([])
    setError(null)
  }, [])

  return { busyKey, busy: busyKey !== null, notice, warnings, error, run, dismiss }
}
