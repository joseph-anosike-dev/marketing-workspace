import type { ItemFilter } from '@/data/repositories/types'
import { normalizeTag } from '@/lib/tags'
import { SECTIONS, type Section } from '@/types'

/** Value of the project filter that means "findings with no project". */
export const NO_PROJECT = 'none'

export const SORTS = ['updated', 'oldest', 'title'] as const
export type VaultSort = (typeof SORTS)[number]

export const SORT_LABELS: Record<VaultSort, string> = {
  updated: 'Recently updated',
  oldest: 'Oldest first',
  title: 'Title A–Z',
}

export interface VaultFilters {
  search: string
  section: Section | ''
  /** A project id, NO_PROJECT, or '' for all projects. */
  project: string
  tag: string
  includeArchived: boolean
  sort: VaultSort
}

/** Reads filters from the page address. Unknown values are ignored. */
export function readVaultFilters(params: URLSearchParams): VaultFilters {
  const section = params.get('section') ?? ''
  const sort = params.get('sort') ?? ''
  return {
    search: (params.get('q') ?? '').trim(),
    section: (SECTIONS as readonly string[]).includes(section)
      ? (section as Section)
      : '',
    project: params.get('project') ?? '',
    tag: normalizeTag(params.get('tag') ?? ''),
    includeArchived: params.get('archived') === '1',
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as VaultSort) : 'updated',
  }
}

/** Applies a change on top of the current address and drops anything empty or default. */
export function writeVaultFilters(
  current: URLSearchParams,
  patch: Partial<VaultFilters>,
): URLSearchParams {
  const merged = { ...readVaultFilters(current), ...patch }
  const next = new URLSearchParams()
  if (merged.search.trim()) next.set('q', merged.search.trim())
  if (merged.section) next.set('section', merged.section)
  if (merged.project) next.set('project', merged.project)
  if (merged.tag) next.set('tag', merged.tag)
  if (merged.includeArchived) next.set('archived', '1')
  if (merged.sort !== 'updated') next.set('sort', merged.sort)
  return next
}

/** True when the filter leaves out some findings, so the list is not the full count. */
export function narrowsResults(filter: ItemFilter): boolean {
  return Boolean(
    filter.search ||
      filter.section ||
      filter.kind ||
      filter.tag ||
      filter.projectId !== undefined,
  )
}

export function toItemFilter(filters: VaultFilters): ItemFilter {
  const result: ItemFilter = {}
  if (filters.search) result.search = filters.search
  if (filters.section) result.section = filters.section
  if (filters.project === NO_PROJECT) result.projectId = null
  else if (filters.project) result.projectId = filters.project
  if (filters.tag) result.tag = filters.tag
  if (filters.includeArchived) result.includeArchived = true
  return result
}

export function sortItems<T extends { title: string; updated_at: string }>(
  items: readonly T[],
  sort: VaultSort,
): T[] {
  const sorted = [...items]
  if (sort === 'title') {
    return sorted.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    )
  }
  if (sort === 'oldest') {
    return sorted.sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  }
  return sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

/** Filters set in the panel (the search box and sort order are not counted). */
export function countActive(filters: VaultFilters): number {
  return [
    filters.section !== '',
    filters.project !== '',
    filters.tag !== '',
    filters.includeArchived,
  ].filter(Boolean).length
}