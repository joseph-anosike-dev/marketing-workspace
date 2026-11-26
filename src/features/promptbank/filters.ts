import { SECTIONS, SECTION_LABELS, type Section } from '@/types'
import { STAGES, STAGE_IDS, stageLabel, type PromptEntry, type StageId } from './types'

export interface PromptFilter {
  kind: PromptEntry['kind']
  section?: Section
  stage?: StageId
  search?: string
}

function searchableText(entry: PromptEntry): string {
  const main = entry.kind === 'guide' ? entry.items.join(' ') : entry.prompt
  return [
    entry.title,
    entry.purpose,
    main,
    entry.good_looks_like,
    SECTION_LABELS[entry.section],
    stageLabel(entry.stage),
  ]
    .join(' ')
    .toLowerCase()
}

/** Entries that match, in journey order (stage first, then section). Content order breaks ties. */
export function filterEntries(entries: readonly PromptEntry[], filter: PromptFilter): PromptEntry[] {
  const words = (filter.search ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  return entries
    .filter((e) => e.kind === filter.kind)
    .filter((e) => !filter.section || e.section === filter.section)
    .filter((e) => !filter.stage || e.stage === filter.stage)
    .filter((e) => {
      if (words.length === 0) return true
      const text = searchableText(e)
      return words.every((w) => text.includes(w))
    })
    .map((entry, order) => ({ entry, order }))
    .sort(
      (a, b) =>
        STAGE_IDS.indexOf(a.entry.stage) - STAGE_IDS.indexOf(b.entry.stage) ||
        SECTIONS.indexOf(a.entry.section) - SECTIONS.indexOf(b.entry.section) ||
        a.order - b.order,
    )
    .map((x) => x.entry)
}

export function parseSection(value: string | null): Section | undefined {
  return (SECTIONS as readonly string[]).includes(value ?? '') ? (value as Section) : undefined
}

export function parseStage(value: string | null): StageId | undefined {
  return STAGES.some((s) => s.id === value) ? (value as StageId) : undefined
}
