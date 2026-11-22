import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { newId, nowIso } from '@/lib/ids'
import { projectCreateSchema, projectUpdateSchema } from '@/lib/schemas'
import { getCurrentUserId } from '@/services/access'
import type { Project } from '@/types'
import type { ProjectRepository } from '../types'

async function list({ includeArchived = false } = {}): Promise<Project[]> {
  const all = await db.projects.toArray()
  return all
    .filter((p) => !p.deleted_at && (includeArchived || p.status === 'active'))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

async function get(id: string): Promise<Project | undefined> {
  const project = await db.projects.get(id)
  return project && !project.deleted_at ? project : undefined
}

async function create(input: Parameters<ProjectRepository['create']>[0]) {
  const data = projectCreateSchema.parse(input)
  const now = nowIso()
  const project: Project = {
    id: newId(),
    owner_id: getCurrentUserId(),
    ...data,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await db.projects.add(project)
  return project
}

async function update(
  id: string,
  patch: Parameters<ProjectRepository['update']>[1],
) {
  const data = projectUpdateSchema.parse(patch)
  if (!(await get(id))) throw new NotFoundError('Project', id)
  await db.projects.update(id, { ...data, updated_at: nowIso() })
  const updated = await get(id)
  if (!updated) throw new NotFoundError('Project', id)
  return updated
}

/**
 * Soft-deletes a project. Its items are either soft-deleted too
 * (deleteItems: true) or moved to the Vault with no project (default).
 */
async function remove(id: string, { deleteItems = false } = {}) {
  const now = nowIso()
  await db.transaction('rw', db.projects, db.research_items, async () => {
    const project = await db.projects.get(id)
    if (!project || project.deleted_at) throw new NotFoundError('Project', id)

    const items = await db.research_items.where('project_id').equals(id).toArray()
    for (const item of items) {
      if (item.deleted_at) continue
      await db.research_items.update(
        item.id,
        deleteItems
          ? { deleted_at: now, updated_at: now }
          : { project_id: null, updated_at: now },
      )
    }
    await db.projects.update(id, { deleted_at: now, updated_at: now })
  })
}

export const localProjects: ProjectRepository = {
  list,
  get,
  create,
  update,
  remove,
}