import { db } from '@/lib/db'
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

export const localTags: TagRepository = { list }