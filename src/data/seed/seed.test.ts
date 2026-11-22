import { beforeEach, describe, expect, it } from 'vitest'
import { bookmarksRepo, toolsRepo } from '@/data/repositories'
import { buildBackup, parseBackup, restoreBackup } from '@/lib/backup'
import { db } from '@/lib/db'
import { seedCategories } from './categories'
import { seedDirectory } from './seedDirectory'
import { seedTools } from './tools'

describe('directory dataset', () => {
  it('has the 18 categories, numbered 1 to 18', () => {
    expect(seedCategories).toHaveLength(18)
    expect(seedCategories.map((c) => c.position)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    )
    expect(new Set(seedCategories.map((c) => c.id)).size).toBe(18)
  })

  it('has unique, URL-safe tool ids', () => {
    const ids = seedTools.map((t) => t.id)
    expect(seedTools.length).toBeGreaterThanOrEqual(150)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('has clean https links with no tracking tags', () => {
    for (const tool of seedTools) {
      const url = new URL(tool.url)
      expect(url.protocol).toBe('https:')
      expect(tool.url).not.toContain('utm_')
    }
  })

  it('gives every tool a name, a use case and a valid pricing label', () => {
    for (const tool of seedTools) {
      expect(tool.name.trim()).not.toBe('')
      expect(tool.use_case.trim()).not.toBe('')
      expect(['free', 'freemium', 'paid', 'unverified']).toContain(tool.pricing)
    }
  })

  it('links every tool to real categories, once each', () => {
    const categoryIds = new Set(seedCategories.map((c) => c.id))
    for (const tool of seedTools) {
      expect(tool.categories.length).toBeGreaterThanOrEqual(1)
      const ids = tool.categories.map((c) => c.category_id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(categoryIds.has(id)).toBe(true)
    }
  })
})

describe('seedDirectory', () => {
  beforeEach(async () => {
    await seedDirectory()
  })

  it('fills the database', async () => {
    const expectedLinks = seedTools.reduce((n, t) => n + t.categories.length, 0)
    expect(await db.categories.count()).toBe(18)
    expect(await db.tools.count()).toBe(seedTools.length)
    expect(await db.tool_categories.count()).toBe(expectedLinks)
  })

  it('can run twice without creating duplicates', async () => {
    await seedDirectory()
    expect(await db.tools.count()).toBe(seedTools.length)
  })

  it('keeps bookmarks when the directory is reloaded', async () => {
    await bookmarksRepo.toggle('ahrefs')
    await seedDirectory()
    expect(await bookmarksRepo.listToolIds()).toEqual(['ahrefs'])
  })
})

describe('toolsRepo', () => {
  beforeEach(async () => {
    await seedDirectory()
  })

  it('lists every tool alphabetically', async () => {
    const tools = await toolsRepo.list()
    expect(tools).toHaveLength(seedTools.length)
    const names = tools.map((t) => t.name)
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
    expect(names).toEqual(sorted)
  })

  it('lists categories in order, with counts', async () => {
    const categories = await toolsRepo.listCategories()
    expect(categories.map((c) => c.position)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    )
    const total = categories.reduce((n, c) => n + c.count, 0)
    expect(total).toBe(seedTools.reduce((n, t) => n + t.categories.length, 0))
  })

  it('shows a tool in each of its categories', async () => {
    const ahrefs = await toolsRepo.get('ahrefs')
    expect(ahrefs?.categories.map((c) => c.id)).toEqual([
      'competitor-brand-research',
      'seo-keyword-research',
    ])
    for (const category of ahrefs?.categories ?? []) {
      const ids = (await toolsRepo.list({ categoryId: category.id })).map((t) => t.id)
      expect(ids).toContain('ahrefs')
    }
  })

  it('keeps a separate use case for each category', async () => {
    const ahrefs = await toolsRepo.get('ahrefs')
    const useCases = ahrefs?.categories.map((c) => c.use_case) ?? []
    expect(new Set(useCases).size).toBe(2)
  })

  it('filters by kind and pricing', async () => {
    const techniques = await toolsRepo.list({ kind: 'technique' })
    expect(techniques.length).toBeGreaterThanOrEqual(1)
    expect(techniques.every((t) => t.kind === 'technique')).toBe(true)

    const unverified = await toolsRepo.list({ pricing: 'unverified' })
    expect(unverified.every((t) => t.pricing === 'unverified')).toBe(true)
  })

  it('searches names, use cases and category names, ignoring case', async () => {
    const byName = await toolsRepo.list({ search: 'AHREFS' })
    expect(byName.map((t) => t.id)).toContain('ahrefs')

    const byCategory = await toolsRepo.list({ search: 'ad libraries' })
    expect(byCategory.length).toBeGreaterThanOrEqual(10)

    expect(await toolsRepo.list({ search: 'zzzzzz-not-a-tool' })).toEqual([])
  })

  it('combines filters', async () => {
    const tools = await toolsRepo.list({
      categoryId: 'seo-keyword-research',
      search: 'moz',
    })
    expect(tools.map((t) => t.id)).toEqual(['moz'])
  })

  it('returns undefined for an unknown tool', async () => {
    expect(await toolsRepo.get('nope')).toBeUndefined()
  })
})

describe('bookmarks', () => {
  beforeEach(async () => {
    await seedDirectory()
  })

  it('adds and removes a bookmark', async () => {
    expect(await bookmarksRepo.toggle('semrush')).toBe(true)
    expect((await toolsRepo.get('semrush'))?.bookmarked).toBe(true)

    expect(await bookmarksRepo.toggle('semrush')).toBe(false)
    expect((await toolsRepo.get('semrush'))?.bookmarked).toBe(false)
    expect(await bookmarksRepo.listToolIds()).toEqual([])
  })

  it('filters to bookmarked tools only', async () => {
    await bookmarksRepo.toggle('moz')
    await bookmarksRepo.toggle('canva')
    const ids = (await toolsRepo.list({ bookmarkedOnly: true })).map((t) => t.id)
    expect(ids.sort()).toEqual(['canva', 'moz'])
  })

  it('refuses to bookmark a tool that does not exist', async () => {
    await expect(bookmarksRepo.toggle('nope')).rejects.toThrow(/Tool not found/)
    expect(await db.bookmarks.count()).toBe(0)
  })

  it('survives a backup and restore', async () => {
    await bookmarksRepo.toggle('moz')
    const text = JSON.stringify(await buildBackup())

    await Promise.all(db.tables.map((table) => table.clear()))
    await restoreBackup(parseBackup(text))
    await seedDirectory()

    const ids = (await toolsRepo.list({ bookmarkedOnly: true })).map((t) => t.id)
    expect(ids).toEqual(['moz'])
  })
})