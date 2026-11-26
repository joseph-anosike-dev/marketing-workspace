import { SECTIONS } from '@/types'
import { PLACEHOLDER_NAMES, STAGE_IDS, type PromptEntry } from './types'
import { entryBodyText, pasteSlots, placeholdersIn } from './placeholders'

/**
 * Checks the content library and returns a list of problems (empty when all is well).
 * A test runs this, so a mistake in the content fails the build instead of reaching a phone.
 */
export function validateEntries(entries: readonly PromptEntry[]): string[] {
  const problems: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const at = `“${entry.id}”`
    const record = entry as unknown as Record<string, unknown>

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.id)) problems.push(`${at}: id must be kebab-case.`)
    if (seen.has(entry.id)) problems.push(`${at}: id is used twice.`)
    seen.add(entry.id)

    if (!(SECTIONS as readonly string[]).includes(entry.section)) problems.push(`${at}: unknown section.`)
    if (!STAGE_IDS.includes(entry.stage)) problems.push(`${at}: unknown stage.`)
    if (!entry.title.trim()) problems.push(`${at}: title is empty.`)
    if (!entry.purpose.trim()) problems.push(`${at}: purpose is empty.`)
    if (!entry.good_looks_like.trim()) problems.push(`${at}: good_looks_like is empty.`)

    if (entry.kind === 'guide') {
      if (entry.items.length === 0 || entry.items.some((i) => !i.trim())) {
        problems.push(`${at}: a guide needs checklist items, none empty.`)
      }
      if ('prompt' in record) problems.push(`${at}: a guide must not have a prompt.`)
    } else {
      if (!entry.prompt.trim()) problems.push(`${at}: an AI prompt needs prompt text.`)
      if ('items' in record) problems.push(`${at}: an AI prompt must not have items.`)
      if (pasteSlots(entry.prompt).length === 0) {
        problems.push(`${at}: the prompt needs a “[Paste ... here]” slot for findings.`)
      }
      if (!/do not invent/i.test(entry.prompt)) {
        problems.push(`${at}: the prompt must tell the AI not to invent facts.`)
      }
      if (!/hypothes/i.test(entry.prompt)) {
        problems.push(`${at}: the prompt must ask for hypotheses to be labelled.`)
      }
    }

    const used = placeholdersIn(entryBodyText(entry))
    for (const name of used) {
      if (!(PLACEHOLDER_NAMES as readonly string[]).includes(name)) {
        problems.push(`${at}: unknown placeholder {${name}}.`)
      }
    }
    const declared = [...entry.placeholders].sort().join(',')
    if (declared !== [...used].sort().join(',')) {
      problems.push(`${at}: placeholders [${entry.placeholders.join(', ')}] do not match those used [${used.join(', ')}].`)
    }
  }

  return problems
}
