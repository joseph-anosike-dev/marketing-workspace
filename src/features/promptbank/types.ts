import type { Section } from '@/types'

/** The nine steps from a first observation to a tested angle. Any guide can be opened on its own. */
export const STAGES = [
  { id: 'observation', label: 'Observation', hint: 'Notice a signal, problem or opportunity.' },
  { id: 'audience', label: 'Audience', hint: 'Work out who has the problem.' },
  { id: 'customer-language', label: 'Customer language', hint: 'Capture the exact words people use.' },
  { id: 'pain-and-trigger', label: 'Pain and trigger', hint: 'Find the cost of the problem and what makes people act.' },
  { id: 'current-solutions', label: 'Current solutions', hint: 'See what people use now, and what they pay.' },
  { id: 'competitor-analysis', label: 'Competitor and offer', hint: 'Study positioning, promises, prices and proof.' },
  { id: 'gap-analysis', label: 'Gaps and opportunities', hint: 'Spot unmet needs and weak claims.' },
  { id: 'angle-development', label: 'Angle development', hint: 'Shape a specific, evidence-based angle.' },
  { id: 'testing', label: 'Testing', hint: 'Pick the cheapest test that gives real evidence.' },
] as const

export type StageId = (typeof STAGES)[number]['id']

export const STAGE_IDS: readonly StageId[] = STAGES.map((s) => s.id)

export const PLACEHOLDER_NAMES = [
  'niche',
  'audience',
  'competitor',
  'product',
  'platform',
  'keyword',
  'price',
  'observation',
] as const

export type PlaceholderName = (typeof PLACEHOLDER_NAMES)[number]

interface EntryBase {
  /** Stable. Never change an id once shipped. */
  id: string
  section: Section
  stage: StageId
  title: string
  /** One sentence. */
  purpose: string
  /** Every {name} used in the entry, and nothing else. */
  placeholders: PlaceholderName[]
  good_looks_like: string
}

/** Manual research steps. Works with no AI. */
export interface GuideEntry extends EntryBase {
  kind: 'guide'
  items: string[]
}

/**
 * An optional prompt to copy into an AI assistant. A slot written as
 * "[Paste ... here]" is where the person's findings go.
 */
export interface AiPromptEntry extends EntryBase {
  kind: 'ai-prompt'
  prompt: string
}

export type PromptEntry = GuideEntry | AiPromptEntry

export function stageLabel(id: StageId): string {
  return STAGES.find((s) => s.id === id)?.label ?? id
}
