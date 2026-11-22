import { describe, expect, it } from 'vitest'
import { countActive, readFilters, toToolFilter, writeFilters } from './filters'

const params = (query: string) => new URLSearchParams(query)

describe('readFilters', () => {
  it('returns empty filters for an empty address', () => {
    expect(readFilters(params(''))).toEqual({
      search: '',
      categoryId: '',
      pricing: '',
      kind: '',
      savedOnly: false,
    })
  })

  it('reads every filter and trims the search text', () => {
    expect(
      readFilters(
        params('q=%20moz%20&category=seo-keyword-research&pricing=free&kind=technique&saved=1'),
      ),
    ).toEqual({
      search: 'moz',
      categoryId: 'seo-keyword-research',
      pricing: 'free',
      kind: 'technique',
      savedOnly: true,
    })
  })

  it('ignores invalid pricing, type and saved values', () => {
    const filters = readFilters(params('pricing=cheap&kind=gadget&saved=yes'))
    expect(filters.pricing).toBe('')
    expect(filters.kind).toBe('')
    expect(filters.savedOnly).toBe(false)
  })
})

describe('writeFilters', () => {
  it('adds a filter and keeps the others', () => {
    const next = writeFilters(params('q=moz'), { pricing: 'paid' })
    expect(next.get('q')).toBe('moz')
    expect(next.get('pricing')).toBe('paid')
  })

  it('removes a filter when it is cleared', () => {
    const next = writeFilters(params('q=moz&category=x'), { categoryId: '' })
    expect(next.has('category')).toBe(false)
    expect(next.get('q')).toBe('moz')
  })

  it('drops blank search text and unknown parameters', () => {
    const next = writeFilters(params('q=a&utm=1'), { search: '   ' })
    expect(next.toString()).toBe('')
  })

  it('writes saved-only as 1 and removes it when off', () => {
    expect(writeFilters(params(''), { savedOnly: true }).get('saved')).toBe('1')
    expect(writeFilters(params('saved=1'), { savedOnly: false }).has('saved')).toBe(false)
  })

  it('round-trips through the address', () => {
    const original = {
      search: 'email',
      categoryId: 'email-newsletter-intelligence',
      pricing: 'unverified' as const,
      kind: 'tool' as const,
      savedOnly: true,
    }
    const address = writeFilters(params(''), original).toString()
    expect(readFilters(params(address))).toEqual(original)
  })
})

describe('toToolFilter and countActive', () => {
  it('includes only the filters that are set', () => {
    expect(toToolFilter(readFilters(params('')))).toEqual({})
    expect(toToolFilter(readFilters(params('q=a&saved=1&pricing=free')))).toEqual({
      search: 'a',
      bookmarkedOnly: true,
      pricing: 'free',
    })
  })

  it('counts panel filters but not the search box', () => {
    expect(countActive(readFilters(params('q=abc')))).toBe(0)
    expect(countActive(readFilters(params('q=abc&category=x&saved=1')))).toBe(2)
  })
})