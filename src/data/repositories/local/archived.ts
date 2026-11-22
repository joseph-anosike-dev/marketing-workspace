import { db } from '@/lib/db'

/** Ids of projects that are archived (and not deleted). */
export async function getArchivedProjectIds(): Promise<Set<string>> {
  const projects = await db.projects.toArray()
  return new Set(
    projects
      .filter((p) => !p.deleted_at && p.status === 'archived')
      .map((p) => p.id),
  )
}