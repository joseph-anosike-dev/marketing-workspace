import { describe, expect, it } from 'vitest'
import { SECTIONS } from '@/types'
import {
  ALL_FIELD_KEYS,
  SECTION_FIELDS,
  buildMetadata,
  describeMetadata,
  readFieldValues,
} from './sectionFields'

describe('SECTION_FIELDS', () => {
  it('defines every section', () => {
    expect(Object.keys(SECTION_FIELDS).sort()).toEqual([...SECTIONS].sort())
  })

  it('uses a unique key for every field', () => {
    expect(new Set(ALL_FIELD_KEYS).size).toBe(ALL_FIELD_KEYS.length)
  })
})

describe('buildMetadata', () => {
  it('keeps only non-empty fields of the chosen section, trimmed', () => {
    const result = buildMetadata({}, 'advertising', {
      ad_platform: 'TikTok',
      ad_hook: '  Tired of 3am wake-ups?  ',
    })
    expect(result).toEqual({
      ad_platform: 'TikTok',
      ad_hook: 'Tired of 3am wake-ups?',
    })
    expect(buildMetadata({}, 'advertising', { ad_platform: '', ad_hook: '   ' })).toEqual({})
  })

  it('drops fields of other sections but keeps unknown keys', () => {
    const result = buildMetadata(
      { competitor_name: 'Acme', imported_from: 'csv' },
      'product',
      { product_type: 'eBook', competitor_name: 'Acme' },
    )
    expect(result).toEqual({ imported_from: 'csv', product_type: 'eBook' })
  })

  it('stores nothing for the General section', () => {
    expect(buildMetadata({}, 'general', { ad_hook: 'x' })).toEqual({})
  })

  it('does not change the object it was given', () => {
    const existing = { competitor_name: 'Acme' }
    buildMetadata(existing, 'product', {})
    expect(existing).toEqual({ competitor_name: 'Acme' })
  })
})

describe('readFieldValues and describeMetadata', () => {
  it('reads text values and ignores missing or non-text ones', () => {
    const values = readFieldValues({ ad_hook: 'Hello', search_volume: 5000 })
    expect(values.ad_hook).toBe('Hello')
    expect(values.search_volume).toBe('')
    expect(values.product_type).toBe('')
  })

  it('describes only the fields of the item’s own section', () => {
    const metadata = { ad_platform: 'TikTok', product_type: 'eBook' }
    expect(describeMetadata('advertising', metadata)).toEqual([
      { label: 'Platform', value: 'TikTok' },
    ])
    expect(describeMetadata('general', metadata)).toEqual([])
  })
})