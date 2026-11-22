import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { newId, nowIso } from '@/lib/ids'
import { getCurrentUserId } from '@/services/access'
import type { BookmarkRepository } from '../directory-types'

async function toggle(toolId: string): Promise<boolean> {
  const owner = getCurrentUserId()
  return db.transaction('rw', [db.bookmarks, db.tools], async () => {
    const existing = await db.bookmarks
      .where('[owner_id+tool_id]')
      .equals([owner, toolId])
      .first()

    // Removing is always allowed, even if the tool has left the directory.
    if (existing) {
      await db.bookmarks.delete(existing.id)
      return false
    }

    if (!(await db.tools.get(toolId))) throw new NotFoundError('Tool', toolId)
    await db.bookmarks.add({
      id: newId(),
      owner_id: owner,
      tool_id: toolId,
      created_at: nowIso(),
    })
    return true
  })
}

async function listToolIds(): Promise<string[]> {
  const owner = getCurrentUserId()
  const all = await db.bookmarks.toArray()
  return all.filter((b) => b.owner_id === owner).map((b) => b.tool_id)
}

export const localBookmarks: BookmarkRepository = { toggle, listToolIds }