import { describe, expect, it } from 'vitest'
import { seedCategories } from '@/data/seed/categories'
import { SECTIONS } from '@/types'
import {
  RESEARCH_TYPES,
  buildSourceUrl,
  getResearchType,
  normalizeDomain,
  type DiscoverSource,
} from './sources'

const query = (url: string): DiscoverSource => ({
  id: 't',
  name: 'T',
  note: '',
  kind: 'query',
  url,
})

describe('normalizeDomain', () => {
  it.each([
    ['example.com', 'example.com'],
    ['  Example.COM  ', 'example.com'],
    ['https://www.example.com/pricing?x=1#top', 'example.com'],
    ['http://shop.example.co.uk/a/b', 'shop.example.co.uk'],
    ['www.example.com.', 'example.com'],
  ])('cleans %j to %j', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected)
  })

  it.each([
    '',
    '   ',
    'plain words',
    'localhost',
    '192.168.0.1',
    'javascript:alert(1)',
    'exa_mple.com',
    '-bad.example.com',
    'example.c',
    'https://',
  ])('rejects %j', (input) => {
    expect(normalizeDomain(input)).toBeNull()
  })
})

describe('buildSourceUrl', () => {
  it('encodes the query so it cannot add parameters or break out of the address', () => {
    const url = buildSourceUrl(query('https://x.test/s?q={q}&safe=1'), 'a&b=c #d é $& 100%')
    expect(url).toBe('https://x.test/s?q=a%26b%3Dc%20%23d%20%C3%A9%20%24%26%20100%25&safe=1')
    const parsed = new URL(url ?? '')
    expect(parsed.searchParams.get('q')).toBe('a&b=c #d é $& 100%')
    expect(parsed.searchParams.get('safe')).toBe('1')
  })

  it('returns null for query sources with no text', () => {
    expect(buildSourceUrl(query('https://x.test/?q={q}'), '   ')).toBeNull()
  })

  it('fills domain sources with the cleaned domain, or null if there is none', () => {
    const source: DiscoverSource = {
      id: 'd',
      name: 'D',
      note: '',
      kind: 'domain',
      url: 'https://sites.test/{domain}/',
    }
    expect(buildSourceUrl(source, 'https://www.Example.com/x')).toBe('https://sites.test/example.com/')
    expect(buildSourceUrl(source, 'not a site')).toBeNull()
  })

  it('always returns fixed links', () => {
    const source: DiscoverSource = { id: 'l', name: 'L', note: '', kind: 'link', url: 'https://l.test/' }
    expect(buildSourceUrl(source, '')).toBe('https://l.test/')
  })
})

describe('launchpad data', () => {
  it('covers every research section except general notes, once each', () => {
    const covered = RESEARCH_TYPES.map((t) => t.section).sort()
    expect(covered).toEqual(SECTIONS.filter((s) => s !== 'general').sort())
    expect(getResearchType('market')?.section).toBe('market')
    expect(getResearchType('general')).toBeUndefined()
    expect(getResearchType(undefined)).toBeUndefined()
  })

  it('only points at directory categories that exist', () => {
    const ids = new Set(seedCategories.map((c) => c.id))
    for (const type of RESEARCH_TYPES) {
      expect(type.categoryIds.length).toBeGreaterThan(0)
      for (const id of type.categoryIds) expect(ids.has(id), id).toBe(true)
    }
  })

  it('has well-formed sources with unique ids in each type', () => {
    for (const type of RESEARCH_TYPES) {
      const ids = type.sources.map((s) => s.id)
      expect(new Set(ids).size, type.section).toBe(ids.length)

      for (const source of type.sources) {
        const where = `${type.section}/${source.id}`
        expect(source.url.startsWith('https://'), where).toBe(true)
        const placeholders = source.url.match(/\{[a-z]+\}/g) ?? []
        if (source.kind === 'query') expect(placeholders, where).toEqual(['{q}'])
        if (source.kind === 'domain') expect(placeholders, where).toEqual(['{domain}'])
        if (source.kind === 'link') expect(placeholders, where).toEqual([])

        const built = buildSourceUrl(source, 'example.com')
        expect(built, where).not.toBeNull()
        expect(() => new URL(built ?? ''), where).not.toThrow()
        expect(built, where).not.toMatch(/[{}]/)
      }
    }
  })
})
