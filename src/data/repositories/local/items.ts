import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { newId, nowIso } from '@/lib/ids'
import { itemCreateSchema, itemUpdateSchema } from '@/lib/schemas'
import { normalizeTag } from '@/lib/tags'
import { getCurrentUserId } from '@/services/access'
import type { ResearchItem, ResearchItemView, Tag } from '@/types'
import type { ItemFilter, ResearchItemRepository } from '../types'
import { getArchivedProjectIds } from './archived'

const WRITE_TABLES = [
  db.research_items,
  db.tags,
  db.research_item_tags,
  db.projects,
]

async function assertProjectExists(projectId: string) {
  const project = await db.projects.get(projectId)
  if (!project || project.deleted_at) throw new NotFoundError('Project', projectId)
}

async function tagNamesByItem(itemIds: string[]) {
  const links = await db.research_item_tags.where('item_id').anyOf(itemIds).toArray()
  const tagIds = [...new Set(links.map((l) => l.tag_id))]
  const tags = await db.tags.bulkGet(tagIds)
  const nameById = new Map(
    tags.filter((t): t is Tag => !!t).map((t) => [t.id, t.name]),
  )

  const byItem = new Map<string, string[]>()
  for (const link of links) {
    const name = nameById.get(link.tag_id)
    if (!name) continue
    const names = byItem.get(link.item_id) ?? []
    names.push(name)
    byItem.set(link.item_id, names)
  }
  for (const names of byItem.values()) names.sort()
  return byItem
}

/** Replaces an item's tags. Must run inside a transaction. */
async function setItemTags(itemId: string, rawNames: string[]) {
  const names = [...new Set(rawNames.map(normalizeTag).filter(Boolean))]
  const owner = getCurrentUserId()
  const tagIds: string[] = []

  for (const name of names) {
    let tag = await db.tags.where('[owner_id+name]').equals([owner, name]).first()
    if (!tag) {
      tag = { id: newId(), owner_id: owner, name, created_at: nowIso() }
      await db.tags.add(tag)
    }
    tagIds.push(tag.id)
  }

  await db.research_item_tags.where('item_id').equals(itemId).delete()
  if (tagIds.length > 0) {
    await db.research_item_tags.bulkAdd(
      tagIds.map((tag_id) => ({ item_id: itemId, tag_id })),
    )
  }
}

async function get(id: string): Promise<ResearchItemView | undefined> {
  const item = await db.research_items.get(id)
  if (!item || item.deleted_at) return undefined
  const tagMap = await tagNamesByItem([id])
  return { ...item, tags: tagMap.get(id) ?? [] }
}

// Loads everything into memory and filters there. That is fine for
// thousands of items; we can add indexed queries later if needed.
async function list(filter: ItemFilter = {}): Promise<ResearchItemView[]> {
  let items = (await db.research_items.toArray()).filter((i) => !i.deleted_at)

  // Hide items of archived projects, unless asked or unless the caller
  // is looking inside one specific project.
  if (filter.projectId === undefined && !filter.includeArchived) {
    const archivedIds = await getArchivedProjectIds()
    items = items.filter((i) => !i.project_id || !archivedIds.has(i.project_id))
  }

  if (filter.projectId !== undefined) {
    items = items.filter((i) => i.project_id === filter.projectId)
  }
  if (filter.section) items = items.filter((i) => i.section === filter.section)
  if (filter.kind) items = items.filter((i) => i.kind === filter.kind)

  const tagMap = await tagNamesByItem(items.map((i) => i.id))
  let views: ResearchItemView[] = items.map((i) => ({
    ...i,
    tags: tagMap.get(i.id) ?? [],
  }))

  if (filter.tag) {
    const wanted = normalizeTag(filter.tag)
    views = views.filter((v) => v.tags.includes(wanted))
  }

  const query = filter.search?.trim().toLowerCase()
  if (query) {
    views = views.filter((v) =>
      [v.title, v.body, v.source_url ?? '', ...v.tags].some((text) =>
        text.toLowerCase().includes(query),
      ),
    )
  }

  return views.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

async function create(input: Parameters<ResearchItemRepository['create']>[0]) {
  const { tags, ...data } = itemCreateSchema.parse(input)
  const now = nowIso()
  const item: ResearchItem = {
    id: newId(),
    owner_id: getCurrentUserId(),
    ...data,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  await db.transaction('rw', WRITE_TABLES, async () => {
    if (item.project_id) await assertProjectExists(item.project_id)
    await db.research_items.add(item)
    await setItemTags(item.id, tags)
  })

  const created = await get(item.id)
  if (!created) throw new NotFoundError('Research item', item.id)
  return created
}

async function update(
  id: string,
  patch: Parameters<ResearchItemRepository['update']>[1],
) {
  const { tags, ...data } = itemUpdateSchema.parse(patch)

  await db.transaction('rw', WRITE_TABLES, async () => {
    const existing = await db.research_items.get(id)
    if (!existing || existing.deleted_at) throw new NotFoundError('Research item', id)
    if (data.project_id) await assertProjectExists(data.project_id)

    await db.research_items.update(id, { ...data, updated_at: nowIso() })
    if (tags !== undefined) await setItemTags(id, tags)
  })

  const updated = await get(id)
  if (!updated) throw new NotFoundError('Research item', id)
  return updated
}

async function remove(id: string) {
  const item = await db.research_items.get(id)
  if (!item || item.deleted_at) throw new NotFoundError('Research item', id)
  const now = nowIso()
  await db.research_items.update(id, { deleted_at: now, updated_at: now })
}

export const localItems: ResearchItemRepository = {
  list,
  get,
  create,
  update,
  remove,
}