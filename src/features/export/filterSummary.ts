import { NO_PROJECT, type VaultFilters } from '@/features/vault/filters'
import { SECTION_LABELS } from '@/types'

/** Stops typed text from being read as Markdown formatting inside the index note. */
function escapeInline(text: string): string {
  return text.replace(/[\\`*_[\]<>|]/g, '\\$&')
}

/**
 * Turns the Vault's search and filters into one readable line for the index
 * note, for example: Search “sleep” · Section: Market Research · Tag: #pricing.
 * Returns undefined when nothing is filtered. The sort order is left out,
 * because it does not change which findings are exported.
 */
export function summarizeVaultFilters(
  filters: VaultFilters,
  projects: ReadonlyArray<{ id: string; name: string }>,
): string | undefined {
  const parts: string[] = []

  const search = filters.search.trim()
  if (search) parts.push(`Search “${escapeInline(search)}”`)

  if (filters.section) parts.push(`Section: ${SECTION_LABELS[filters.section]}`)

  if (filters.project === NO_PROJECT) {
    parts.push('Project: No project')
  } else if (filters.project) {
    const name = projects.find((p) => p.id === filters.project)?.name
    parts.push(`Project: ${name ? escapeInline(name) : 'Unknown project'}`)
  }

  if (filters.tag) parts.push(`Tag: #${filters.tag}`)
  if (filters.includeArchived) parts.push('Including archived projects')

  return parts.length > 0 ? parts.join(' · ') : undefined
}
