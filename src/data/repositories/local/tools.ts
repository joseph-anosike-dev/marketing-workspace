import { db } from '@/lib/db'
import { getCurrentUserId } from '@/services/access'
import type {
  CategoryWithCount,
  ToolCategoryInfo,
  ToolFilter,
  ToolRepository,
  ToolView,
} from '../directory-types'

async function loadAll(): Promise<ToolView[]> {
  const [categories, tools, links, bookmarks] = await Promise.all([
    db.categories.toArray(),
    db.tools.toArray(),
    db.tool_categories.toArray(),
    db.bookmarks.toArray(),
  ])

  const owner = getCurrentUserId()
  const bookmarked = new Set(
    bookmarks.filter((b) => b.owner_id === owner).map((b) => b.tool_id),
  )
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // Keep each tool's categories in the same order as the category list.
  const orderedLinks = [...links].sort(
    (a, b) =>
      (categoryById.get(a.category_id)?.position ?? 0) -
      (categoryById.get(b.category_id)?.position ?? 0),
  )

  const byTool = new Map<string, ToolCategoryInfo[]>()
  for (const link of orderedLinks) {
    const category = categoryById.get(link.category_id)
    if (!category) continue
    const list = byTool.get(link.tool_id) ?? []
    list.push({ id: category.id, name: category.name, use_case: link.use_case })
    byTool.set(link.tool_id, list)
  }

  return tools
    .map((tool) => ({
      ...tool,
      categories: byTool.get(tool.id) ?? [],
      bookmarked: bookmarked.has(tool.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

async function list(filter: ToolFilter = {}): Promise<ToolView[]> {
  let tools = await loadAll()

  if (filter.categoryId) {
    tools = tools.filter((t) => t.categories.some((c) => c.id === filter.categoryId))
  }
  if (filter.pricing) tools = tools.filter((t) => t.pricing === filter.pricing)
  if (filter.kind) tools = tools.filter((t) => t.kind === filter.kind)
  if (filter.bookmarkedOnly) tools = tools.filter((t) => t.bookmarked)

  const query = filter.search?.trim().toLowerCase()
  if (query) {
    tools = tools.filter((t) =>
      [
        t.name,
        t.use_case,
        ...t.categories.flatMap((c) => [c.name, c.use_case]),
      ].some((text) => text.toLowerCase().includes(query)),
    )
  }

  return tools
}

async function get(id: string): Promise<ToolView | undefined> {
  return (await loadAll()).find((t) => t.id === id)
}

async function listCategories(): Promise<CategoryWithCount[]> {
  const [categories, links, tools] = await Promise.all([
    db.categories.toArray(),
    db.tool_categories.toArray(),
    db.tools.toArray(),
  ])
  const toolIds = new Set(tools.map((t) => t.id))
  const counts = new Map<string, number>()
  for (const link of links) {
    if (toolIds.has(link.tool_id)) {
      counts.set(link.category_id, (counts.get(link.category_id) ?? 0) + 1)
    }
  }
  return categories
    .map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))
    .sort((a, b) => a.position - b.position)
}

export const localTools: ToolRepository = { listCategories, list, get }