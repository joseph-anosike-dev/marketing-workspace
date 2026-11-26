import type { PromptEntry } from '../types'
import { AI_PROMPTS } from './aiPrompts'
import { GUIDES } from './guides'

/** The whole library. To add content, add an entry to guides.ts or aiPrompts.ts. */
export const ENTRIES: readonly PromptEntry[] = [...GUIDES, ...AI_PROMPTS]

export function getEntry(id: string | undefined): PromptEntry | undefined {
  return ENTRIES.find((e) => e.id === id)
}
