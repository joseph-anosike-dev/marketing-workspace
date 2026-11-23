import { describe, expect, it } from 'vitest'
import {
  NO_PROJECT,
  countActive,
  readVaultFilters,
  sortItems,
  toItemFilter,
  writeVaultFilters,
} from './filters'

const params = (query: string) => new URLSearchParams(query)

describe('readVaultFilters', () => {
  it('returns defaults for an empty address', () => {
    expect(readVaultFilters(params(''))).toEqual({
      search: '',
      section: '',
      project: '',
      tag: '',
      includeArchived: false,
      sort: 'updated',
    })
  })

  it('reads every filter and cleans the tag', () => {
    expect(
      readVaultFilters(
        params('q=%20sleep%20&section=customer&project=abc&tag=Baby%20Sleep&archived=1&sort=title'),
      ),
    ).toEqual({
      search: 'sleep',
      section: 'customer',
      project: 'abc',
      tag: 'baby-sleep',
      includeArchived: true,
      sort: 'title',
    })
  })

  it('ignores an invalid section, sort and archived value', () => {
    const filters = readVaultFilters(params('section=nonsense&sort=random&archived=yes'))
    expect(filters.section).toBe('')
    expect(filters.sort).toBe('updated')
    expect(filters.includeArchived).toBe(false)
  })
})

describe('writeVaultFilters', () => {
  it('adds a filter and keeps the others', () => {
    const next = writeVaultFilters(params('q=moz'), { section: 'market' })
    expect(next.get('q')).toBe('moz')
    expect(next.get('section')).toBe('market')
  })

  it('removes a filter when it is cleared', () => {
    const next = writeVaultFilters(params('q=moz&tag=a'), { tag: '' })
    expect(next.has('tag')).toBe(false)
    expect(next.get('q')).toBe('moz')
  })

  it('leaves the default sort out of the address', () => {
    expect(writeVaultFilters(params(''), { sort: 'updated' }).has('sort')).toBe(false)
    expect(writeVaultFilters(params(''), { sort: 'oldest' }).get('sort')).toBe('oldest')
  })

  it('drops unknown parameters', () => {
    expect(writeVaultFilters(params('utm=1'), {}).toString()).toBe('')
  })

  it('round-trips through the address', () => {
    const original = {
      search: 'email',
      section: 'keyword' as const,
      project: NO_PROJECT,
      tag: 'pricing',
      includeArchived: true,
      sort: 'title' as const,
    }
    const address = writeVaultFilters(params(''), original).toString()
    expect(readVaultFilters(params(address))).toEqual(original)
  })
})

describe('toItemFilter', () => {
  it('is empty when nothing is set', () => {
    expect(toItemFilter(readVaultFilters(params('')))).toEqual({})
  })

  it('maps "no project" to a null project id', () => {
    expect(toItemFilter(readVaultFilters(params(`project=${NO_PROJECT}`)))).toEqual({
      projectId: null,
    })
  })

  it('maps a project, section, tag, search and archived flag', () => {
    expect(
      toItemFilter(
        readVaultFilters(params('project=abc&section=market&tag=x&q=hi&archived=1')),
      ),
    ).toEqual({
      projectId: 'abc',
      section: 'market',
      tag: 'x',
      search: 'hi',
      includeArchived: true,
    })
  })
})

describe('sortItems', () => {
  const items = [
    { title: 'banana', updated_at: '2026-01-02T00:00:00Z' },
    { title: 'Apple', updated_at: '2026-01-03T00:00:00Z' },
    { title: 'cherry', updated_at: '2026-01-01T00:00:00Z' },
  ]

  it('sorts by most recently updated', () => {
    expect(sortItems(items, 'updated').map((i) => i.title)).toEqual([
      'Apple',
      'banana',
      'cherry',
    ])
  })

  it('sorts oldest first', () => {
    expect(sortItems(items, 'oldest').map((i) => i.title)).toEqual([
      'cherry',
      'banana',
      'Apple',
    ])
  })

  it('sorts by title, ignoring case', () => {
    expect(sortItems(items, 'title').map((i) => i.title)).toEqual([
      'Apple',
      'banana',
      'cherry',
    ])
  })

  it('does not change the list it was given', () => {
    const copy = [...items]
    sortItems(items, 'title')
    expect(items).toEqual(copy)
  })
})

describe('countActive', () => {
  it('counts panel filters but not search or sort', () => {
    expect(countActive(readVaultFilters(params('q=a&sort=title')))).toBe(0)
    expect(
      countActive(readVaultFilters(params('section=market&tag=x&archived=1'))),
    ).toBe(3)
  })
})