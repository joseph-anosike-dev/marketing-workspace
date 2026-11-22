import type { ToolFilter } from '@/data/repositories/directory-types'
import { PRICING_LABELS, type Pricing } from '@/types'

export type KindFilter = 'tool' | 'technique' | ''

export interface DirectoryFilters {
  search: string
  categoryId: string
  pricing: Pricing | ''
  kind: KindFilter
  savedOnly: boolean
}

function isPricing(value: string): value is Pricing {
  return (PRICING_LABELS as readonly string[]).includes(value)
}

/** Reads filters from the page address. Unknown or invalid values are ignored. */
export function readFilters(params: URLSearchParams): DirectoryFilters {
  const pricing = params.get('pricing') ?? ''
  const kind = params.get('kind') ?? ''
  return {
    search: (params.get('q') ?? '').trim(),
    categoryId: params.get('category') ?? '',
    pricing: isPricing(pricing) ? pricing : '',
    kind: kind === 'tool' || kind === 'technique' ? kind : '',
    savedOnly: params.get('saved') === '1',
  }
}

/** Applies a change on top of the current address and drops anything empty. */
export function writeFilters(
  current: URLSearchParams,
  patch: Partial<DirectoryFilters>,
): URLSearchParams {
  const merged = { ...readFilters(current), ...patch }
  const next = new URLSearchParams()
  if (merged.search.trim()) next.set('q', merged.search.trim())
  if (merged.categoryId) next.set('category', merged.categoryId)
  if (merged.pricing) next.set('pricing', merged.pricing)
  if (merged.kind) next.set('kind', merged.kind)
  if (merged.savedOnly) next.set('saved', '1')
  return next
}

export function toToolFilter(filters: DirectoryFilters): ToolFilter {
  const result: ToolFilter = {}
  if (filters.search) result.search = filters.search
  if (filters.categoryId) result.categoryId = filters.categoryId
  if (filters.pricing) result.pricing = filters.pricing
  if (filters.kind) result.kind = filters.kind
  if (filters.savedOnly) result.bookmarkedOnly = true
  return result
}

/** Number of filters set in the filter panel (the search box is not counted). */
export function countActive(filters: DirectoryFilters): number {
  return [
    filters.categoryId !== '',
    filters.pricing !== '',
    filters.kind !== '',
    filters.savedOnly,
  ].filter(Boolean).length
}