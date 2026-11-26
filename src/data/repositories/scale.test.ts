import { describe, expect, it } from 'vitest'
import { itemsRepo, tagsRepo, trashRepo } from '@/data/repositories'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/services/access'

// These guard against lookups that slow down sharply as data grows. Before
// the fix, 2,000 findings took about 9 seconds to list. The limits here are
// generous so that slow machines do not fail them by accident.
const COUNT = 3000

async function seed(deletedEvery = 0) {
  const owner = getCurrentUserId()
  const now = new Date().toISOString()
  await db.tags.bulkAdd(
    Array.from({ length: 100 }, (_, i) => ({ id: `t${i}`, owner_id: owner, name: `tag${i}`, created_at: now })),
  )
  const items = Array.from({ length: COUNT }, (_, i) => ({
    id: `i${i}`,
    owner_id: owner,
    project_id: null,
    section: 'market' as const,
    kind: 'note' as const,
    title: `Finding ${i}`,
    body: `Some research text number ${i}`,
    source_url: null,
    metadata: {},
    created_at: now,
    updated_at: now,
    deleted_at: deletedEvery && i % deletedEvery === 0 ? now : null,
  }))
  await db.research_items.bulkAdd(items)
  await db.research_item_tags.bulkAdd(
    items.flatMap((item, i) => [0, 1, 2].map((k) => ({ item_id: item.id, tag_id: `t${(i + k * 7) % 100}` }))),
  )
}

async function seconds<T>(fn: () => Promise<T>) {
  const start = performance.now()
  const result = await fn()
  return { result, seconds: (performance.now() - start) / 1000 }
}

describe('with thousands of findings', () => {
  it('lists them, with their tags, quickly', async () => {
    await seed()
    const { result, seconds: took } = await seconds(() => itemsRepo.list())
    expect(result).toHaveLength(COUNT)
    expect(result[0].tags).toHaveLength(3)
    expect(took).toBeLessThan(3)
  })

  it('searches and lists tags quickly', async () => {
    await seed()
    const search = await seconds(() => itemsRepo.list({ search: 'number 29' }))
    expect(search.result.length).toBeGreaterThan(0)
    expect(search.seconds).toBeLessThan(3)
    expect((await seconds(() => tagsRepo.list())).seconds).toBeLessThan(3)
  })

  it('shows and empties a large Trash quickly', async () => {
    await seed(2) // every second finding is in Trash
    const list = await seconds(() => trashRepo.list())
    expect(list.result.items).toHaveLength(COUNT / 2)
    expect(list.seconds).toBeLessThan(3)

    const emptied = await seconds(() => trashRepo.empty())
    expect(emptied.result.items).toBe(COUNT / 2)
    expect(emptied.seconds).toBeLessThan(5)
    expect(await db.research_items.count()).toBe(COUNT / 2)
  })
})
