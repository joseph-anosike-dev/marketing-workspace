import { describe, expect, it } from 'vitest'
import {
  deriveKind,
  normalizeUrlInput,
  parseTags,
  tagsToText,
  toggleTagInText,
} from './formUtils'

describe('parseTags', () => {
  it('cleans, de-duplicates and skips empty tags', () => {
    expect(parseTags('Baby Sleep, #baby sleep, , Pricing')).toEqual([
      'baby-sleep',
      'pricing',
    ])
  })

  it('returns nothing for blank text', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags(' , ,, ')).toEqual([])
  })
})

describe('toggleTagInText', () => {
  it('adds a missing tag', () => {
    expect(toggleTagInText('a, b', 'c')).toBe('a, b, c')
    expect(toggleTagInText('', 'c')).toBe('c')
  })

  it('removes a tag that is already there', () => {
    expect(toggleTagInText('a, b, c', 'b')).toBe('a, c')
  })

  it('round-trips with tagsToText', () => {
    expect(tagsToText(parseTags('x, y'))).toBe('x, y')
  })
})

describe('normalizeUrlInput', () => {
  it.each([
    ['', ''],
    ['   ', ''],
    ['example.com', 'https://example.com'],
    ['  example.com/page  ', 'https://example.com/page'],
    ['https://example.com', 'https://example.com'],
    ['http://example.com', 'http://example.com'],
  ])('turns %j into %j', (input, expected) => {
    expect(normalizeUrlInput(input)).toBe(expected)
  })

  it.each([
    'javascript:alert(1)',
    'example.com:8080',
    'not a url',
    'localhost',
    'mailto:me@example.com',
  ])('leaves %j alone so validation can reject it', (input) => {
    expect(normalizeUrlInput(input)).toBe(input)
  })
})

describe('deriveKind', () => {
  it('uses link when there is a URL and note when there is not', () => {
    expect(deriveKind('note', 'https://example.com')).toBe('link')
    expect(deriveKind('link', '')).toBe('note')
  })

  it('never changes an image', () => {
    expect(deriveKind('image', '')).toBe('image')
    expect(deriveKind('image', 'https://example.com')).toBe('image')
  })
})