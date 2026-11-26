import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { SECTIONS, SECTION_LABELS } from '@/types'
import { EntryBadges } from './Badges'
import { ENTRIES } from './content'
import { filterEntries, parseSection, parseStage } from './filters'
import { usePlaceholderValues } from './hooks'
import { fillPlaceholders } from './placeholders'
import { STAGES, type PromptEntry } from './types'

const chip =
  'min-h-10 shrink-0 rounded-full border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none '
const chipOn = 'border-primary bg-primary text-primary-foreground'

export function PromptBankPage() {
  const [params, setParams] = useSearchParams()
  const [values] = usePlaceholderValues()
  const kind: PromptEntry['kind'] = params.get('kind') === 'ai' ? 'ai-prompt' : 'guide'
  const section = parseSection(params.get('section'))
  const stage = parseStage(params.get('stage'))
  const search = params.get('q') ?? ''

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const entries = filterEntries(ENTRIES, { kind, section, stage, search })
  const filtered = Boolean(section || stage || search)
  const noun = kind === 'guide' ? 'guide' : 'prompt'

  return (
    <div>
      <PageHeader
        title="Prompt Bank"
        description="Practical research guides and optional AI analysis prompts."
      />

      <div role="group" aria-label="Type" className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={kind === 'guide' ? 'default' : 'outline'}
          aria-pressed={kind === 'guide'}
          className="h-11"
          onClick={() => update({ kind: null })}
        >
          Guides
        </Button>
        <Button
          type="button"
          variant={kind === 'ai-prompt' ? 'default' : 'outline'}
          aria-pressed={kind === 'ai-prompt'}
          className="h-11"
          onClick={() => update({ kind: 'ai' })}
        >
          Optional AI
        </Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {kind === 'guide'
          ? 'Steps you do yourself, with no AI needed. Tick them off as you go.'
          : 'Prompts to copy into an AI assistant of your choice, to analyse findings you have already saved.'}
      </p>

      <label htmlFor="pb-search" className="sr-only">
        Search the Prompt Bank
      </label>
      <input
        id="pb-search"
        type="search"
        className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Search, for example “reviews” or “price”"
        value={search}
        onChange={(e) => update({ q: e.target.value })}
      />

      <div role="group" aria-label="Section" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" aria-pressed={!section} className={chip + (!section ? chipOn : '')} onClick={() => update({ section: null })}>
          All sections
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={section === s}
            className={chip + (section === s ? chipOn : '')}
            onClick={() => update({ section: section === s ? null : s })}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label htmlFor="pb-stage" className="mb-1 block text-sm font-medium">
          Research stage
        </label>
        <select
          id="pb-stage"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-72"
          value={stage ?? ''}
          onChange={(e) => update({ stage: e.target.value || null })}
        >
          <option value="">Any stage</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {stage && (
          <p className="mt-1 text-xs text-muted-foreground">
            {STAGES.find((s) => s.id === stage)?.hint}
          </p>
        )}
      </div>

      <p className="mb-2 text-sm text-muted-foreground" role="status">
        {entries.length} {noun}
        {entries.length === 1 ? '' : 's'}
        {filtered ? ' match' : ''}
      </p>

      {entries.length === 0 ? (
        <div className="rounded-md border p-4 text-sm">
          <p>Nothing matches those filters.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11"
            onClick={() => update({ section: null, stage: null, q: null })}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                to={`/prompts/${entry.id}`}
                className="block space-y-2 rounded-md border p-3 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <EntryBadges entry={entry} />
                <span className="block text-base font-medium">{fillPlaceholders(entry.title, values)}</span>
                <span className="block text-sm text-muted-foreground">
                  {fillPlaceholders(entry.purpose, values)}
                </span>
                {entry.kind === 'guide' && (
                  <span className="block text-xs text-muted-foreground">{entry.items.length} steps</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        The Prompt Bank never creates, edits, tags or files your findings. Copying is the only way
        anything leaves it.
      </p>
    </div>
  )
}
