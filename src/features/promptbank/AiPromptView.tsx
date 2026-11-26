import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { SECTION_LABELS } from '@/types'
import { EntryBadges } from './Badges'
import { CopyButton } from './CopyButton'
import { usePlaceholderValues } from './hooks'
import { completedPrompt, fillPlaceholders, pasteSlots } from './placeholders'
import { PlaceholderInputs } from './PlaceholderInputs'
import type { AiPromptEntry } from './types'

export function AiPromptView({ entry }: { entry: AiPromptEntry }) {
  const [values, setValue] = usePlaceholderValues()
  const slots = pasteSlots(entry.prompt)
  const [pastes, setPastes] = useState<string[]>(() => slots.map(() => ''))
  const empty = pastes.every((p) => !p.trim())
  const preview = completedPrompt(entry, values, pastes)

  function setPaste(index: number, text: string) {
    setPastes((previous) => previous.map((p, i) => (i === index ? text : p)))
  }

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-2">
        <EntryBadges entry={entry} />
        <h1 className="text-2xl font-semibold tracking-tight">{fillPlaceholders(entry.title, values)}</h1>
        <p className="text-sm text-muted-foreground">{fillPlaceholders(entry.purpose, values)}</p>
      </header>

      <p className="rounded-md bg-muted px-3 py-2 text-sm">
        This is optional. Copy the prompt, then paste it into an AI assistant you choose. Nothing
        is sent from this app, and nothing is saved from the AI’s answer unless you save it
        yourself.
      </p>

      <PlaceholderInputs names={entry.placeholders} values={values} onChange={setValue} />

      <section aria-labelledby="pb-paste" className="space-y-3">
        <h2 id="pb-paste" className="text-base font-semibold">
          Your findings
        </h2>
        <p className="text-sm text-muted-foreground">
          The AI uses only what you paste. Include each finding’s title, and its id if you have it,
          so the AI can say which finding backs each point.
        </p>
        {slots.map((slot, index) => (
          <div key={`${slot}-${index}`}>
            <label htmlFor={`pb-paste-${index}`} className="mb-1 block text-sm font-medium">
              Paste {slot}
            </label>
            <textarea
              id={`pb-paste-${index}`}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={6}
              value={pastes[index] ?? ''}
              onChange={(e) => setPaste(index, e.target.value)}
            />
          </div>
        ))}
        {empty && (
          <p className="text-sm text-muted-foreground">
            No findings yet? Collect some first.{' '}
            <Link
              to={`/prompts?kind=guide&section=${entry.section}`}
              className="underline"
            >
              See the {SECTION_LABELS[entry.section]} guides
            </Link>
            . If you copy now, the paste spot stays in the prompt for you to fill in later.
          </p>
        )}
      </section>

      <section aria-labelledby="pb-prompt" className="space-y-3">
        <h2 id="pb-prompt" className="text-base font-semibold">
          Prompt
        </h2>
        <CopyButton variant="default" label="Copy completed prompt" getText={() => preview} />
        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer py-1 text-sm font-medium">Preview the prompt</summary>
          <pre className="mt-2 max-h-96 overflow-auto text-xs leading-relaxed break-words whitespace-pre-wrap">
            {preview}
          </pre>
        </details>
      </section>

      <section aria-labelledby="pb-good" className="rounded-md border p-3">
        <h2 id="pb-good" className="text-sm font-semibold">
          What good looks like
        </h2>
        <p className="mt-1 text-sm">{entry.good_looks_like}</p>
      </section>

      <Link to="/prompts?kind=ai" className={buttonVariants({ variant: 'outline' }) + ' h-11'}>
        Back to Optional AI
      </Link>
    </article>
  )
}
