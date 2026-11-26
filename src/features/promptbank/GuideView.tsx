import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { SECTION_LABELS } from '@/types'
import { EntryBadges } from './Badges'
import { CopyButton } from './CopyButton'
import { useChecklistProgress, usePlaceholderValues } from './hooks'
import { checklistText, fillPlaceholders, guideText } from './placeholders'
import { PlaceholderInputs } from './PlaceholderInputs'
import type { GuideEntry } from './types'

export function GuideView({ entry }: { entry: GuideEntry }) {
  const [values, setValue] = usePlaceholderValues()
  const { done, toggle, reset } = useChecklistProgress(entry.id, entry.items.length)
  const discoverTo = entry.section === 'general' ? '/discover' : `/discover/${entry.section}`

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-2">
        <EntryBadges entry={entry} />
        <h1 className="text-2xl font-semibold tracking-tight">{fillPlaceholders(entry.title, values)}</h1>
        <p className="text-sm text-muted-foreground">{fillPlaceholders(entry.purpose, values)}</p>
      </header>

      <PlaceholderInputs names={entry.placeholders} values={values} onChange={setValue} />

      <section aria-labelledby="pb-steps" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="pb-steps" className="text-base font-semibold">
            Checklist
          </h2>
          <span className="text-xs text-muted-foreground">
            {done.length} of {entry.items.length} done
          </span>
        </div>

        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          You do these steps yourself.{' '}
          <Link to={discoverTo} className="underline">
            Open {SECTION_LABELS[entry.section]} sources in Discover
          </Link>{' '}
          for places to look.
        </p>

        <ul className="space-y-1">
          {entry.items.map((item, index) => {
            const id = `pb-item-${index}`
            const checked = done.includes(index)
            return (
              <li key={id}>
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm has-[:checked]:bg-muted/60"
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0"
                    checked={checked}
                    onChange={() => toggle(index)}
                  />
                  <span className={checked ? 'text-muted-foreground line-through' : ''}>
                    {fillPlaceholders(item, values)}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="flex flex-wrap items-start gap-2">
          <CopyButton label="Copy checklist" getText={() => checklistText(entry, values, done)} />
          <CopyButton label="Copy whole guide" getText={() => guideText(entry, values, done)} />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={done.length === 0}
            onClick={reset}
          >
            Reset ticks
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ticks are only a place-keeper on this phone. They do not create or change any finding.
        </p>
      </section>

      <section aria-labelledby="pb-good" className="rounded-md border p-3">
        <h2 id="pb-good" className="text-sm font-semibold">
          What good looks like
        </h2>
        <p className="mt-1 text-sm">{entry.good_looks_like}</p>
      </section>

      <Link to="/prompts" className={buttonVariants({ variant: 'outline' }) + ' h-11'}>
        Back to the Prompt Bank
      </Link>
    </article>
  )
}
