import { describe, expect, it } from 'vitest'
import { countByProject, countBySection, readSection } from './summary'

describe('countByProject', () => {
  it('counts items per project and ignores items with no project', () => {
    const counts = countByProject([
      { project_id: 'a' },
      { project_id: 'a' },
      { project_id: 'b' },
      { project_id: null },
    ])
    expect(counts.get('a')).toBe(2)
    expect(counts.get('b')).toBe(1)
    expect(counts.size).toBe(2)
  })

  it('returns an empty map for no items', () => {
    expect(countByProject([]).size).toBe(0)
  })
})

describe('countBySection', () => {
  it('counts every section, including empty ones', () => {
    const counts = countBySection([
      { section: 'market' },
      { section: 'market' },
      { section: 'keyword' },
    ])
    expect(counts).toEqual({
      market: 2,
      competitor: 0,
      advertising: 0,
      customer: 0,
      product: 0,
      keyword: 1,
      general: 0,
    })
  })
})

describe('readSection', () => {
  it('reads a valid section', () => {
    expect(readSection(new URLSearchParams('section=customer'))).toBe('customer')
  })

  it('treats a missing or unknown section as all', () => {
    expect(readSection(new URLSearchParams(''))).toBe('')
    expect(readSection(new URLSearchParams('section=nonsense'))).toBe('')
  })
})