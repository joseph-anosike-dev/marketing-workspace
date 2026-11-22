import { describe, expect, it } from 'vitest'
import {
  itemCreateSchema,
  itemUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
} from './schemas'

describe('project schemas', () => {
  it('applies defaults and trims on create', () => {
    expect(projectCreateSchema.parse({ name: '  Mums  ' })).toEqual({
      name: 'Mums',
      description: '',
      status: 'active',
    })
  })

  it('rejects empty or whitespace-only names', () => {
    expect(projectCreateSchema.safeParse({ name: '' }).success).toBe(false)
    expect(projectCreateSchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(
      projectCreateSchema.safeParse({ name: 'x', status: 'deleted' }).success,
    ).toBe(false)
  })

  it('does not inject defaults on update', () => {
    expect(projectUpdateSchema.parse({ name: 'x' })).toEqual({ name: 'x' })
  })
})

describe('item schemas', () => {
  const base = { section: 'market', title: 'A title' } as const

  it('applies defaults on create', () => {
    expect(itemCreateSchema.parse(base)).toMatchObject({
      project_id: null,
      kind: 'note',
      body: '',
      source_url: null,
      metadata: {},
      tags: [],
    })
  })

  it('does not inject defaults on update', () => {
    expect(itemUpdateSchema.parse({ title: 'x' })).toEqual({ title: 'x' })
  })

  it('requires a title and a valid section', () => {
    expect(itemCreateSchema.safeParse({ ...base, title: ' ' }).success).toBe(false)
    expect(itemCreateSchema.safeParse({ ...base, section: 'nope' }).success).toBe(false)
  })

  it('rejects a title longer than 200 characters', () => {
    expect(
      itemCreateSchema.safeParse({ ...base, title: 'x'.repeat(201) }).success,
    ).toBe(false)
  })

  it.each(['https://example.com', 'http://example.com/path?q=1'])(
    'accepts the web address %s',
    (source_url) => {
      expect(itemCreateSchema.safeParse({ ...base, source_url }).success).toBe(true)
    },
  )

  it.each([
    'example.com',
    'javascript:alert(1)',
    'ftp://example.com',
    'data:text/html,hi',
  ])('rejects the address %s', (source_url) => {
    expect(itemCreateSchema.safeParse({ ...base, source_url }).success).toBe(false)
  })

  it('stores a blank URL as null', () => {
    expect(itemCreateSchema.parse({ ...base, source_url: '   ' }).source_url).toBeNull()
  })
})