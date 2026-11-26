import type { AiPromptEntry, GuideEntry, PromptEntry } from './types'

const TOKEN = /\{([a-z_]+)\}/g
const PASTE_SLOT = /\[Paste ([^\]]+?) here\]/g

export type PlaceholderValues = Partial<Record<string, string>>

/** The {names} used in some text, once each, in order of first use. */
export function placeholdersIn(text: string): string[] {
  const found: string[] = []
  for (const match of text.matchAll(TOKEN)) {
    if (!found.includes(match[1])) found.push(match[1])
  }
  return found
}

/** All the text of an entry that can hold placeholders. */
export function entryBodyText(entry: PromptEntry): string {
  const main = entry.kind === 'guide' ? entry.items.join('\n') : entry.prompt
  return `${entry.title}\n${entry.purpose}\n${main}`
}

/**
 * Fills in {names} the person has typed a value for. A blank value leaves the
 * {name} showing. The stored text is never changed; a new string is returned.
 */
export function fillPlaceholders(text: string, values: PlaceholderValues): string {
  return text.replace(TOKEN, (whole, name: string) => {
    const value = values[name]?.trim()
    return value ? value : whole
  })
}

/** What each "[Paste ... here]" slot in a prompt asks for, in order. */
export function pasteSlots(prompt: string): string[] {
  return [...prompt.matchAll(PASTE_SLOT)].map((m) => m[1])
}

/** Puts pasted findings into the prompt's slots. An empty paste leaves its slot as written. */
export function fillPasteSlots(prompt: string, pastes: readonly string[]): string {
  let index = 0
  return prompt.replace(PASTE_SLOT, (whole) => {
    const pasted = pastes[index++]?.trim()
    return pasted ? pasted : whole
  })
}

/** The prompt exactly as it will be copied: placeholders first, then the findings. */
export function completedPrompt(
  entry: AiPromptEntry,
  values: PlaceholderValues,
  pastes: readonly string[],
): string {
  return fillPasteSlots(fillPlaceholders(entry.prompt, values), pastes)
}

/** Checklist lines as Markdown tasks, ready to paste into Obsidian. */
export function checklistText(
  entry: GuideEntry,
  values: PlaceholderValues,
  done: readonly number[] = [],
): string {
  return entry.items
    .map((item, i) => `- [${done.includes(i) ? 'x' : ' '}] ${fillPlaceholders(item, values)}`)
    .join('\n')
}

export function guideText(
  entry: GuideEntry,
  values: PlaceholderValues,
  done: readonly number[] = [],
): string {
  return [
    `# ${fillPlaceholders(entry.title, values)}`,
    fillPlaceholders(entry.purpose, values),
    checklistText(entry, values, done),
    `**What good looks like:** ${entry.good_looks_like}`,
  ].join('\n\n')
}
