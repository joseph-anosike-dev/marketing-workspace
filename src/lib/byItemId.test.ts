import { describe, expect, it } from 'vitest'
import { deleteRowsForItems, rowsForItems } from './byItemId'
import { db } from './db'

async function seedLinks(itemCount: number) {
  const links = Array.from({ length: itemCount }, (_, i) => [
    { item_id: `i${i}`, tag_id: 'a' },
    { item_id: `i${i}`, tag_id: 'b' },
  ]).flat()
  await db.research_item_tags.bulkAdd(links)
}

const ids = (count: number) => Array.from({ length: count }, (_, i) => `i${i * 2}`)

describe('rowsForItems', () => {
  it('returns nothing for no ids', async () => {
    await seedLinks(10)
    expect(await rowsForItems(db.research_item_tags, [])).toEqual([])
  })

  it('gives the same answer for a few ids and for many ids', async () => {
    await seedLinks(200)
    for (const count of [3, 50, 51, 100]) {
      const rows = await rowsForItems(db.research_item_tags, ids(count))
      expect(rows).toHaveLength(count * 2)
      expect(new Set(rows.map((r) => r.item_id))).toEqual(new Set(ids(count)))
    }
  })

  it('ignores ids that have no rows', async () => {
    await seedLinks(5)
    const many = [...ids(3), ...Array.from({ length: 80 }, (_, i) => `missing${i}`)]
    expect(await rowsForItems(db.research_item_tags, many)).toHaveLength(6)
  })
})

describe('deleteRowsForItems', () => {
  it.each([3, 80])('deletes only the rows of %i ids', async (count) => {
    await seedLinks(200)
    await deleteRowsForItems(db.research_item_tags, ids(count))
    expect(await db.research_item_tags.count()).toBe((200 - count) * 2)
    expect(await db.research_item_tags.where('item_id').equals('i1').count()).toBe(2)
    expect(await db.research_item_tags.where('item_id').equals('i0').count()).toBe(0)
  })
})
