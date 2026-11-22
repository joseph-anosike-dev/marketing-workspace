import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { itemsRepo, projectsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import { formatDate, plural } from '@/lib/format'
import type { Project } from '@/types'
import { DeleteProjectModal } from './DeleteProjectModal'
import { ProjectFormModal } from './ProjectFormModal'
import { StatusBadge } from './StatusBadge'
import { countByProject } from './summary'

const openLinkClass =
  'inline-flex h-10 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-8'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const load = useCallback(async () => {
    try {
      const [allProjects, items] = await Promise.all([
        projectsRepo.list({ includeArchived: true }),
        itemsRepo.list({ includeArchived: true }),
      ])
      setProjects(allProjects)
      setCounts(countByProject(items))
      setError(null)
    } catch (e) {
      setError(describeError(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const archivedCount = projects?.filter((p) => p.status === 'archived').length ?? 0

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (projects ?? [])
      .filter((p) => showArchived || p.status === 'active')
      .filter(
        (p) =>
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      )
  }, [projects, search, showArchived])

  function openForm(project: Project | null) {
    setEditing(project)
    setFormOpen(true)
  }

  async function toggleArchive(project: Project) {
    try {
      await projectsRepo.update(project.id, {
        status: project.status === 'active' ? 'archived' : 'active',
      })
      await load()
    } catch (e) {
      setError(describeError(e))
    }
  }

  const noProjectsAtAll = projects !== null && projects.length === 0
  const nothingVisible = projects !== null && projects.length > 0 && visible.length === 0

  return (
    <>
      <PageHeader
        title="Research Projects"
        description="Organise your research into dedicated projects."
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xl flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-md border bg-background pr-3 pl-9 text-sm sm:h-10"
          />
        </div>
        <Button
          type="button"
          className="h-11 gap-2 sm:h-10"
          onClick={() => openForm(null)}
        >
          <Plus className="size-4" aria-hidden="true" />
          New project
        </Button>
      </div>

      {archivedCount > 0 && (
        <label className="mb-4 flex min-h-9 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-4"
          />
          Show archived ({archivedCount})
        </label>
      )}

      {projects === null && !error && (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      )}

      {noProjectsAtAll && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A project keeps the research for one market, niche or idea together.
          </p>
          <Button type="button" className="mt-4" onClick={() => openForm(null)}>
            Create your first project
          </Button>
        </div>
      )}

      {nothingVisible && (
        <div className="rounded-lg border border-dashed p-6 text-sm">
          {search.trim()
            ? 'No projects match your search.'
            : 'All your projects are archived. Tick “Show archived” to see them.'}
        </div>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="min-w-0 flex-1 leading-snug font-medium break-words">
                  <Link to={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </h2>
                <StatusBadge status={project.status} />
              </div>

              {project.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                {plural(counts.get(project.id) ?? 0, 'finding')} · Updated{' '}
                {formatDate(project.updated_at)}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Link to={`/projects/${project.id}`} className={openLinkClass}>
                  Open
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 md:h-8"
                  onClick={() => openForm(project)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 md:h-8"
                  onClick={() => void toggleArchive(project)}
                >
                  {project.status === 'active' ? 'Archive' : 'Restore'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 md:h-8"
                  onClick={() => setDeleting(project)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProjectFormModal
        open={formOpen}
        project={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved, wasNew) => {
          setFormOpen(false)
          if (wasNew) navigate(`/projects/${saved.id}`)
          else void load()
        }}
      />

      <DeleteProjectModal
        project={deleting}
        itemCount={deleting ? (counts.get(deleting.id) ?? 0) : 0}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null)
          void load()
        }}
      />
    </>
  )
}