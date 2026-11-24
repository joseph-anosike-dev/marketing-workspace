import { describe, expect, it } from 'vitest'
import { readVaultFilters } from '@/features/vault/filters'
import { summarizeVaultFilters } from './filterSummary'

const projects = [
  { id: 'p1', name: 'Mums' },
  { id: 'p2', name: 'Pets' },
]

function summary(query: string): string | undefined {
  return summarizeVaultFilters(readVaultFilters(new URLSearchParams(query)), projects)
}

describe('summarizeVaultFilters', () => {
  it('returns nothing when nothing is filtered', () => {
    expect(summary('')).toBeUndefined()
  })

  it('ignores the sort order and blank search text', () => {
    expect(summary('sort=title')).toBeUndefined()
    expect(summary('q=%20%20')).toBeUndefined()
  })

  it('describes the search text', () => {
    expect(summary('q=sleep')).toBe('Search “sleep”')
  })

  it('describes the section with its full name', () => {
    expect(summary('section=market')).toBe('Section: Market Research')
  })

  it('describes a project by name, "no project", or an unknown project', () => {
    expect(summary('project=p1')).toBe('Project: Mums')
    expect(summary('project=none')).toBe('Project: No project')
    expect(summary('project=ghost')).toBe('Project: Unknown project')
  })

  it('describes the tag in its cleaned-up form', () => {
    expect(summary('tag=Pricing')).toBe('Tag: #pricing')
  })

  it('mentions archived projects', () => {
    expect(summary('archived=1')).toBe('Including archived projects')
  })

  it('joins several filters in a steady order', () => {
    expect(summary('tag=pricing&q=sleep&section=market&project=p2&archived=1')).toBe(
      'Search “sleep” · Section: Market Research · Project: Pets · Tag: #pricing · Including archived projects',
    )
  })

  it('keeps typed text from turning into formatting', () => {
    expect(summary('q=a_b*c')).toBe('Search “a\\_b\\*c”')
    expect(summary('q=%3Cb%3E')).toBe('Search “\\<b\\>”')
  })
})
