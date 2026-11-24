import { describe, expect, it } from 'vitest'
import { createNamer, relativePath, slugify } from './naming'

describe('slugify', () => {
  it('makes lowercase, hyphenated names', () => {
    expect(slugify('Acme Co. — Pricing Page!')).toBe('acme-co-pricing-page')
  })

  it('removes accents', () => {
    expect(slugify('Crème Brûlée Ọ̀ṣun')).toBe('creme-brulee-osun')
  })

  it('falls back when nothing usable is left', () => {
    expect(slugify('日本語')).toBe('untitled')
    expect(slugify('🎯🎯')).toBe('untitled')
    expect(slugify('', 'project')).toBe('project')
  })

  it('avoids names Windows refuses', () => {
    expect(slugify('CON')).toBe('con-file')
    expect(slugify('com1')).toBe('com1-file')
    expect(slugify('console')).toBe('console')
  })

  it('shortens long names without a trailing hyphen', () => {
    const slug = slugify('word '.repeat(40))
    expect(slug.length).toBeLessThan(61)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('createNamer', () => {
  it('adds -2, -3 for repeated names', () => {
    const namer = createNamer()
    expect(namer.claim('p/market', 'pricing', '.md')).toBe('p/market/pricing.md')
    expect(namer.claim('p/market', 'pricing', '.md')).toBe('p/market/pricing-2.md')
    expect(namer.claim('p/market', 'pricing', '.md')).toBe('p/market/pricing-3.md')
  })

  it('ignores case and keeps folders separate', () => {
    const namer = createNamer()
    namer.claim('p/market', 'Pricing', '.md')
    expect(namer.claim('p/market', 'pricing', '.md')).toBe('p/market/pricing-2.md')
    expect(namer.claim('p/customer', 'pricing', '.md')).toBe('p/customer/pricing.md')
  })
})

describe('relativePath', () => {
  it('goes up out of a section folder', () => {
    expect(relativePath('p/market/x.md', 'p/attachments/y.png')).toBe(
      '../attachments/y.png',
    )
  })

  it('stays in the same folder tree', () => {
    expect(relativePath('s/s.md', 's/attachments/y.png')).toBe('attachments/y.png')
  })
})