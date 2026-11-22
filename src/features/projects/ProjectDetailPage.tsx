import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { itemsRepo, projectsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import { formatDate, plural } from '@/lib/format'
import {
  SECTIONS,
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
} from '@/types'
import { DeleteProjectModal } from './DeleteProjectModal'
import { ProjectFormModal } from './ProjectFormModal'
import { StatusBadge } from './StatusBadge'
import { countBySection, readSection } from './summary'

const BODY_PREVIEW_LENGTH = 280

function preview(text: string): string {
  return text.length > BODY_PREVIEW_LENGTH
    ? `${text.slice(0, BODY_PREVIEW_LENGTH).trimEnd()}…`
    : text
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = readSection(searchParams)

  // undefined = still loading, null = no such project
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [items, setItems] = useState<ResearchItemView[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const found = await projectsRepo.get(projectId)
      setProject(found ?? null)
      // Opening a project directly shows its items even if it is archived.
      setItems(found ? await itemsRepo.list({ projectId }) : [])
      setError(null)
    } catch (e) {
      setError(describeError(e))
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleArchive() {
    if (!project) return
    try {
      const updated = await projectsRepo.update(project.id, {
        status: project.status === 'active' ? 'archived' : 'active',
      })
      setProject(updated)
    } catch (e) {
      setError(describeError(e))
    }
  }

  const backLink = (
    <Link
      to="/projects"
      className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Projects
    </Link>
  )

  if (error) {
    return (
      <>
        {backLink}
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      </>
    )
  }

  if (project === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (project === null) {
    return (
      <>
        {backLink}
        <h1 className="mt-4 text-2xl font-semibold">Project not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been deleted.{' '}
          <Link to="/projects" className="underline">
            Back to your projects
          </Link>
        </p>
      </>
    )
  }

  const counts = countBySection(items)
  const visible = section ? items.filter((i) => i.section === section) : items
  const tabs = [
    { value: '', label: 'All', count: items.length },
    ...SECTIONS.map((s) => ({ value: s, label: SECTION_LABELS[s], count: counts[s] })),
  ]

  return (
    <>
      {backLink}

      <div className="mt-2 mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words md:text-3xl">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {project.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {plural(items.length, 'finding')} · Created{' '}
            {formatDate(project.created_at)} · Updated{' '}
            {formatDate(project.updated_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => void toggleArchive()}
          >
            {project.status === 'active' ? 'Archive' : 'Restore'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {project.status === 'archived' && (
        <div
          role="status"
          className="mb-6 flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            This project is archived. Its findings are hidden from the Vault and from
            search until you restore it.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            onClick={() => void toggleArchive()}
          >
            Restore project
          </Button>
        </div>
      )}

      <nav aria-label="Research sections" className="mb-5">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {tabs.map((tab) => {
            const active = section === tab.value
            return (
              <li key={tab.value || 'all'} className="shrink-0">
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() =>
                    setSearchParams(tab.value ? { section: tab.value } : {}, {
                      replace: true,
                    })
                  }
                  className={
                    'min-h-10 rounded-full border px-4 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ' +
                    (active
                      ? 'border-primary bg-primary font-medium text-primary-foreground'
                      : 'hover:bg-accent')
                  }
                >
                  {tab.label}{' '}
                  <span className={active ? 'opacity-80' : 'text-muted-foreground'}>
                    {tab.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {items.length === 0
            ? 'No findings in this project yet. Forms for adding findings arrive in the next stage. For now you can add test items on the Developer page (#/dev).'
            : `No findings in ${SECTION_LABELS[section as keyof typeof SECTION_LABELS]} yet.`}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-4"
            >
              <h2 className="leading-snug font-medium break-words">{item.title}</h2>
              {!section && (
                <p className="text-xs text-muted-foreground">
                  {SECTION_LABELS[item.section]}
                </p>
              )}
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm break-all underline"
                >
                  {item.source_url}
                </a>
              )}
              {item.body && (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {preview(item.body)}
                </p>
              )}
              {item.tags.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {item.tags.map((t) => `#${t}`).join(' ')}
                </p>
              )}
              <p className="mt-auto pt-1 text-xs text-muted-foreground">
                Updated {formatDate(item.updated_at)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <ProjectFormModal
        open={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setEditOpen(false)
          setProject(saved)
        }}
      />

      <DeleteProjectModal
        project={deleteOpen ? project : null}
        itemCount={items.length}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate('/projects')}
      />
    </>
  )
}