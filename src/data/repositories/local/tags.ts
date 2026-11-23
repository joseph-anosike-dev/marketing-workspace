import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { normalizeTag } from '@/lib/tags'
import type { TagWithCount } from '@/types'
import type { TagRepository } from '../types'
import { getArchivedProjectIds } from './archived'

async function list({ includeArchived = false } = {}): Promise<TagWithCount[]> {
  const [tags, links, items, archivedIds] = await Promise.all([
    db.tags.toArray(),
    db.research_item_tags.toArray(),
    db.research_items.toArray(),
    getArchivedProjectIds(),
  ])

  // Count only items that are not deleted and (unless asked) not in archived projects.
  const countedItemIds = new Set(
    items
      .filter((i) => !i.deleted_at)
      .filter(
        (i) => includeArchived || !i.project_id || !archivedIds.has(i.project_id),
      )
      .map((i) => i.id),
  )

  const counts = new Map<string, number>()
  for (const link of links) {
    if (countedItemIds.has(link.item_id)) {
      counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1)
    }
  }

  return tags
    .map((tag) => ({ ...tag, count: counts.get(tag.id) ?? 0 }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

async function rename(id: string, newName: string) {
  const name = normalizeTag(newName)
  if (!name) throw new Error('Enter a tag name using letters or numbers.')
  if (name.length > 60) throw new Error('Tag names can be at most 60 characters.')

  return db.transaction('rw', [db.tags, db.research_item_tags], async () => {
    const tag = await db.tags.get(id)
    if (!tag) throw new NotFoundError('Tag', id)
    if (tag.name === name) return { name, merged: false }

    const target = await db.tags
      .where('[owner_id+name]')
      .equals([tag.owner_id, name])
      .first()

    if (!target) {
      await db.tags.update(id, { name })
      return { name, merged: false }
    }

    // Merge: move this tag's links onto the existing tag, then delete this tag.
    const sourceLinks = await db.research_item_tags
      .where('tag_id')
      .equals(id)
      .toArray()
    const targetLinks = await db.research_item_tags
      .where('tag_id')
      .equals(target.id)
      .toArray()
    const alreadyTagged = new Set(targetLinks.map((l) => l.item_id))
    const toAdd = sourceLinks
      .filter((l) => !alreadyTagged.has(l.item_id))
      .map((l) => ({ item_id: l.item_id, tag_id: target.id }))

    if (toAdd.length > 0) await db.research_item_tags.bulkAdd(toAdd)
    await db.research_item_tags.where('tag_id').equals(id).delete()
    await db.tags.delete(id)
    return { name, merged: true }
  })
}

async function remove(id: string) {
  await db.transaction('rw', [db.tags, db.research_item_tags], async () => {
    const tag = await db.tags.get(id)
    if (!tag) throw new NotFoundError('Tag', id)
    await db.research_item_tags.where('tag_id').equals(id).delete()
    await db.tags.delete(id)
  })
}

export const localTags: TagRepository = { list, rename, remove }