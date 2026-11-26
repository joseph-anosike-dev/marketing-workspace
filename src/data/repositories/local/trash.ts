import { deleteRowsForItems, rowsForItems } from '@/lib/byItemId'
import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { nowIso } from '@/lib/ids'
import type { Project, ResearchItem } from '@/types'
import type {
  TrashContents,
  TrashedItem,
  TrashedProject,
  TrashRepository,
} from '../trash-types'

const TRASH_TABLES = [
  db.projects,
  db.research_items,
  db.tags,
  db.research_item_tags,
  db.attachments,
]

/**
 * Deleting a project with its findings gives them all the same deletion
 * time, which is how we know they were deleted together. A finding deleted
 * earlier on its own has a different time and is treated separately.
 */
function isTrashedWithProject(item: ResearchItem, project: Project): boolean {
  return (
    project.deleted_at !== null &&
    item.project_id === project.id &&
    item.deleted_at === project.deleted_at
  )
}

/** Deletes findings for good, with their tag links and images. Run inside a transaction. */
async function purgeItemRows(ids: string[]) {
  if (ids.length === 0) return
  await deleteRowsForItems(db.research_item_tags, ids)
  await deleteRowsForItems(db.attachments, ids)
  await db.research_items.bulkDelete(ids)
}

/** Removes tags that no finding uses any more. Run inside a transaction. */
async function deleteUnusedTags() {
  const links = await db.research_item_tags.toArray()
  const used = new Set(links.map((l) => l.tag_id))
  const unused = (await db.tags.toArray()).filter((t) => !used.has(t.id))
  await db.tags.bulkDelete(unused.map((t) => t.id))
}

async function list(): Promise<TrashContents> {
  const [projects, items] = await Promise.all([
    db.projects.toArray(),
    db.research_items.toArray(),
  ])
  const trashedProjects = projects.filter((p) => p.deleted_at)
  const trashedItems = items.filter((i) => i.deleted_at)
  const projectById = new Map(projects.map((p) => [p.id, p]))

  const files = await rowsForItems(
    db.attachments,
    trashedItems.map((i) => i.id),
  )
  const usage = new Map<string, { count: number; bytes: number }>()
  for (const file of files) {
    const entry = usage.get(file.item_id) ?? { count: 0, bytes: 0 }
    entry.count += 1
    entry.bytes += file.size_bytes
    usage.set(file.item_id, entry)
  }

  const grouped = new Set<string>()
  const projectRows: TrashedProject[] = trashedProjects.map((project) => {
    const members = trashedItems.filter((i) => isTrashedWithProject(i, project))
    let imageCount = 0
    let imageBytes = 0
    for (const member of members) {
      grouped.add(member.id)
      imageCount += usage.get(member.id)?.count ?? 0
      imageBytes += usage.get(member.id)?.bytes ?? 0
    }
    return { project, itemCount: members.length, imageCount, imageBytes }
  })

  const itemRows: TrashedItem[] = trashedItems
    .filter((i) => !grouped.has(i.id))
    .map((item) => {
      const parent = item.project_id ? projectById.get(item.project_id) : undefined
      return {
        item,
        projectName: parent?.name ?? null,
        projectInTrash: !!parent?.deleted_at,
        imageCount: usage.get(item.id)?.count ?? 0,
        imageBytes: usage.get(item.id)?.bytes ?? 0,
      }
    })

  const newestFirst = (a: string | null, b: string | null) =>
    (b ?? '').localeCompare(a ?? '')
  projectRows.sort((a, b) => newestFirst(a.project.deleted_at, b.project.deleted_at))
  itemRows.sort((a, b) => newestFirst(a.item.deleted_at, b.item.deleted_at))

  let imageCount = 0
  let imageBytes = 0
  for (const entry of usage.values()) {
    imageCount += entry.count
    imageBytes += entry.bytes
  }
  return { projects: projectRows, items: itemRows, imageCount, imageBytes }
}

async function restoreItem(id: string) {
  return db.transaction('rw', [db.research_items, db.projects], async () => {
    const item = await db.research_items.get(id)
    if (!item || !item.deleted_at) throw new NotFoundError('Deleted finding', id)

    let movedToVault = false
    let projectId = item.project_id
    if (projectId) {
      const parent = await db.projects.get(projectId)
      if (!parent || parent.deleted_at) {
        projectId = null
        movedToVault = true
      }
    }
    await db.research_items.update(id, {
      project_id: projectId,
      deleted_at: null,
      updated_at: nowIso(),
    })
    return { movedToVault }
  })
}

async function restoreProject(id: string) {
  return db.transaction('rw', [db.research_items, db.projects], async () => {
    const project = await db.projects.get(id)
    if (!project || !project.deleted_at) throw new NotFoundError('Deleted project', id)

    const now = nowIso()
    const items = await db.research_items.where('project_id').equals(id).toArray()
    const together = items.filter((i) => isTrashedWithProject(i, project))
    for (const item of together) {
      await db.research_items.update(item.id, { deleted_at: null, updated_at: now })
    }
    await db.projects.update(id, { deleted_at: null, updated_at: now })
    return { restoredItems: together.length }
  })
}

async function purgeItem(id: string) {
  await db.transaction('rw', TRASH_TABLES, async () => {
    const item = await db.research_items.get(id)
    // Only findings already in Trash can be deleted for good.
    if (!item || !item.deleted_at) throw new NotFoundError('Deleted finding', id)
    await purgeItemRows([id])
    await deleteUnusedTags()
  })
}

async function purgeProject(id: string) {
  await db.transaction('rw', TRASH_TABLES, async () => {
    const project = await db.projects.get(id)
    if (!project || !project.deleted_at) throw new NotFoundError('Deleted project', id)

    const items = await db.research_items.where('project_id').equals(id).toArray()
    await purgeItemRows(
      items.filter((i) => isTrashedWithProject(i, project)).map((i) => i.id),
    )
    // Findings deleted earlier on their own stay in Trash, but must not
    // point at a project that no longer exists.
    for (const item of items) {
      if (!isTrashedWithProject(item, project)) {
        await db.research_items.update(item.id, { project_id: null })
      }
    }
    await db.projects.delete(id)
    await deleteUnusedTags()
  })
}

async function empty() {
  return db.transaction('rw', TRASH_TABLES, async () => {
    const itemIds = (await db.research_items.toArray())
      .filter((i) => i.deleted_at)
      .map((i) => i.id)
    const projectIds = (await db.projects.toArray())
      .filter((p) => p.deleted_at)
      .map((p) => p.id)

    await purgeItemRows(itemIds)
    await db.research_items
      .where('project_id')
      .anyOf(projectIds)
      .modify({ project_id: null })
    await db.projects.bulkDelete(projectIds)
    await deleteUnusedTags()
    return { projects: projectIds.length, items: itemIds.length }
  })
}

export const localTrash: TrashRepository = {
  list,
  restoreItem,
  restoreProject,
  purgeItem,
  purgeProject,
  empty,
}
