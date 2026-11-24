import type { ToolView } from '@/data/repositories/directory-types'
import { countByProject } from '@/features/projects/summary'
import type { Project, ResearchItemView } from '@/types'

export const RECENT_PROJECTS = 4
export const RECENT_FINDINGS = 5
export const SAVED_TOOLS_SHOWN = 6

export interface RecentProject {
  project: Project
  findingCount: number
}

export interface RecentFinding {
  item: ResearchItemView
  /** Name of the project the finding is in, or null if it is only in the Vault. */
  projectName: string | null
}

export interface DashboardSummary {
  projectCount: number
  findingCount: number
  recentProjects: RecentProject[]
  recentFindings: RecentFinding[]
}

const newestFirst = (a: { updated_at: string }, b: { updated_at: string }) =>
  b.updated_at.localeCompare(a.updated_at)

/**
 * Archived projects and their findings are left out, the same as in the
 * Vault, so the dashboard shows what is currently being worked on.
 */
export function summarizeDashboard(
  projects: readonly Project[],
  items: readonly ResearchItemView[],
): DashboardSummary {
  const active = projects.filter((p) => p.status === 'active' && !p.deleted_at)
  const activeById = new Map(active.map((p) => [p.id, p]))
  const archivedIds = new Set(
    projects.filter((p) => p.status === 'archived').map((p) => p.id),
  )

  const visible = items.filter(
    (i) => !i.deleted_at && (!i.project_id || !archivedIds.has(i.project_id)),
  )
  const counts = countByProject(visible)

  return {
    projectCount: active.length,
    findingCount: visible.length,
    recentProjects: [...active]
      .sort(newestFirst)
      .slice(0, RECENT_PROJECTS)
      .map((project) => ({ project, findingCount: counts.get(project.id) ?? 0 })),
    recentFindings: [...visible]
      .sort(newestFirst)
      .slice(0, RECENT_FINDINGS)
      .map((item) => ({
        item,
        projectName: item.project_id ? (activeById.get(item.project_id)?.name ?? null) : null,
      })),
  }
}

/** The saved tools to show (alphabetical) and how many are saved in all. */
export function pickSavedTools(
  tools: readonly ToolView[],
  limit = SAVED_TOOLS_SHOWN,
): { shown: ToolView[]; total: number } {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))
  return { shown: sorted.slice(0, limit), total: sorted.length }
}
