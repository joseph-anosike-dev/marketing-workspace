import { describe, expect, it } from 'vitest'
import type { ToolView } from '@/data/repositories/directory-types'
import type { Project, ResearchItemView } from '@/types'
import {
  RECENT_FINDINGS,
  RECENT_PROJECTS,
  pickSavedTools,
  summarizeDashboard,
} from './summary'

function project(id: string, updated: string, status: Project['status'] = 'active'): Project {
  return {
    id,
    owner_id: 'u',
    name: `Project ${id}`,
    description: '',
    status,
    created_at: updated,
    updated_at: updated,
    deleted_at: null,
  }
}

function item(id: string, updated: string, projectId: string | null = null): ResearchItemView {
  return {
    id,
    owner_id: 'u',
    project_id: projectId,
    section: 'market',
    kind: 'note',
    title: `Finding ${id}`,
    body: '',
    source_url: null,
    metadata: {},
    tags: [],
    created_at: updated,
    updated_at: updated,
    deleted_at: null,
  }
}

describe('summarizeDashboard', () => {
  it('is empty with no data', () => {
    expect(summarizeDashboard([], [])).toEqual({
      projectCount: 0,
      findingCount: 0,
      recentProjects: [],
      recentFindings: [],
    })
  })

  it('orders by most recent update, whatever order the data arrives in', () => {
    const result = summarizeDashboard(
      [project('a', '2026-01-01'), project('b', '2026-03-01'), project('c', '2026-02-01')],
      [item('x', '2026-01-05'), item('y', '2026-04-01')],
    )
    expect(result.recentProjects.map((r) => r.project.id)).toEqual(['b', 'c', 'a'])
    expect(result.recentFindings.map((r) => r.item.id)).toEqual(['y', 'x'])
  })

  it('limits how many recent projects and findings are shown, but counts them all', () => {
    const projects = Array.from({ length: 9 }, (_, i) => project(`p${i}`, `2026-01-0${i + 1}`))
    const items = Array.from({ length: 12 }, (_, i) =>
      item(`i${i}`, `2026-02-${String(i + 1).padStart(2, '0')}`),
    )
    const result = summarizeDashboard(projects, items)
    expect(result.recentProjects).toHaveLength(RECENT_PROJECTS)
    expect(result.recentFindings).toHaveLength(RECENT_FINDINGS)
    expect(result.projectCount).toBe(9)
    expect(result.findingCount).toBe(12)
  })

  it('leaves out archived projects and the findings inside them', () => {
    const result = summarizeDashboard(
      [project('live', '2026-01-01'), project('old', '2026-05-01', 'archived')],
      [item('a', '2026-01-02', 'live'), item('b', '2026-05-02', 'old'), item('c', '2026-01-03')],
    )
    expect(result.projectCount).toBe(1)
    expect(result.findingCount).toBe(2)
    expect(result.recentProjects.map((r) => r.project.id)).toEqual(['live'])
    expect(result.recentFindings.map((r) => r.item.id)).toEqual(['c', 'a'])
  })

  it('counts findings per project and names the project of each finding', () => {
    const result = summarizeDashboard(
      [project('p', '2026-01-01'), project('q', '2026-01-02')],
      [item('a', '2026-02-01', 'p'), item('b', '2026-02-02', 'p'), item('c', '2026-02-03')],
    )
    const counts = Object.fromEntries(
      result.recentProjects.map((r) => [r.project.id, r.findingCount]),
    )
    expect(counts).toEqual({ p: 2, q: 0 })
    const names = Object.fromEntries(
      result.recentFindings.map((r) => [r.item.id, r.projectName]),
    )
    expect(names).toEqual({ a: 'Project p', b: 'Project p', c: null })
  })
})

describe('pickSavedTools', () => {
  const tool = (name: string) => ({ id: name.toLowerCase(), name }) as ToolView

  it('sorts by name, limits the list and reports the total', () => {
    const tools = ['Delta', 'alpha', 'Charlie', 'Bravo'].map(tool)
    const { shown, total } = pickSavedTools(tools, 3)
    expect(shown.map((t) => t.name)).toEqual(['alpha', 'Bravo', 'Charlie'])
    expect(total).toBe(4)
  })

  it('handles no saved tools', () => {
    expect(pickSavedTools([])).toEqual({ shown: [], total: 0 })
  })
})
