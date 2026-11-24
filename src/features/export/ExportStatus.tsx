import { Button } from '@/components/ui/button'

interface ExportStatusProps {
  notice: string | null
  warnings: string[]
  error: string | null
  onDismiss: () => void
}

/** The message shown after an export: what was exported, anything left out, or what went wrong. */
export function ExportStatus({ notice, warnings, error, onDismiss }: ExportStatusProps) {
  if (!notice && warnings.length === 0 && !error) return null

  return (
    <div className="mb-4 space-y-2">
      {notice && (
        <p role="status" className="rounded-md border bg-muted/50 p-3 text-sm">
          {notice}
        </p>
      )}

      {warnings.length > 0 && (
        <div
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-medium">Some images were left out:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  )
}
