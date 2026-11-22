import { db } from '@/lib/db'
import type { Tool, ToolCategory } from '@/types'
import { seedCategories } from './categories'
import { seedTools } from './tools'

/**
 * Loads the built-in directory into the database. The directory is
 * reference data, so each run replaces it completely. This is safe to
 * repeat, and if anything fails the transaction rolls back and the
 * previous directory stays in place. Bookmarks are never touched.
 */
export async function seedDirectory(): Promise<void> {
  const tools: Tool[] = seedTools.map((t) => ({
    id: t.id,
    name: t.name,
    use_case: t.use_case,
    url: t.url,
    pricing: t.pricing,
    kind: t.kind,
  }))

  const links: ToolCategory[] = seedTools.flatMap((t) =>
    t.categories.map((c) => ({
      tool_id: t.id,
      category_id: c.category_id,
      use_case: c.use_case,
    })),
  )

  await db.transaction(
    'rw',
    [db.categories, db.tools, db.tool_categories],
    async () => {
      await db.categories.clear()
      await db.tools.clear()
      await db.tool_categories.clear()
      await db.categories.bulkAdd(seedCategories)
      await db.tools.bulkAdd(tools)
      await db.tool_categories.bulkAdd(links)
    },
  )
}