import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { wipeUserData } from '@/lib/backup'

const CONFIRM_WORD = 'DELETE'

export function WipeDataPanel() {
  const [armed, setArmed] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function cancel() {
    setArmed(false)
    setTyped('')
  }

  async function handleWipe() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      await wipeUserData()
      setMessage('All data erased.')
      cancel()
    } catch (e) {
      setError(
        `Could not erase data: ${e instanceof Error ? e.message : String(e)}. Nothing was changed.`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-red-300 p-4">
      <h2 className="font-semibold text-red-800">Erase all data</h2>
      <p className="text-sm text-muted-foreground">
        Permanently deletes every project, finding, tag, image and bookmark in
        this browser. The tools directory is kept. This cannot be undone, so
        download a backup first.
      </p>

      {!armed ? (
        <Button type="button" variant="destructive" onClick={() => setArmed(true)}>
          Erase all data…
        </Button>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (typed === CONFIRM_WORD) void handleWipe()
          }}
        >
          <label className="block text-sm" htmlFor="wipe-confirm">
            Type <strong>{CONFIRM_WORD}</strong> to confirm.
          </label>
          <input
            id="wipe-confirm"
            autoComplete="off"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              disabled={typed !== CONFIRM_WORD || busy}
            >
              Erase everything
            </Button>
            <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

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
