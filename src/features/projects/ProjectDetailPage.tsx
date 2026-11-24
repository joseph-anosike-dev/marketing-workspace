import { ArrowLeft, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { itemsRepo, projectsRepo, tagsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import { formatDate, plural } from '@/lib/format'
import {
  SECTIONS,
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
  type TagWithCount,
} from '@/types'
import { DeleteItemModal } from './DeleteItemModal'
import { DeleteProjectModal } from './DeleteProjectModal'
import { ItemFormModal } from './ItemFormModal'
import { ItemImages } from './ItemImages'
import { ProjectFormModal } from './ProjectFormModal'
import { describeMetadata } from './sectionFields'
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
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [existingTags, setExistingTags] = useState<TagWithCount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ResearchItemView | null>(null)
  const [deletingItem, setDeletingItem] = useState<ResearchItemView | null>(null)

  const load = useCallback(async () => {
    try {
      const [found, projects, tags] = await Promise.all([
        projectsRepo.get(projectId),
        projectsRepo.list(),
        tagsRepo.list({ includeArchived: true }),
      ])
      setProject(found ?? null)
      setActiveProjects(projects)
      setExistingTags(tags)
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

  function openItemForm(item: ResearchItemView | null) {
    setNotice(null)
    setEditingItem(item)
    setItemFormOpen(true)
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

  // The project itself is always an option, even when it is archived.
  const projectOptions = activeProjects.some((p) => p.id === project.id)
    ? activeProjects
    : [...activeProjects, project]

  const emptyMessage =
    items.length === 0
      ? 'No findings in this project yet.'
      : `No findings in ${section ? SECTION_LABELS[section] : 'this section'} yet.`

  return (
    <>
      {backLink}

      <div className="mt-2 mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
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

        <div className="flex flex-wrap gap-2 md:shrink-0 md:justify-end">
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

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-md border bg-muted/50 p-3 text-sm"
        >
          {notice}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Findings</h2>
        <Button
          type="button"
          className="h-10 gap-2"
          onClick={() => openItemForm(null)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add finding
        </Button>
      </div>

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
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10"
            onClick={() => openItemForm(null)}
          >
            Add a finding
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => {
            const fields = describeMetadata(item.section, item.metadata)
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4"
              >
                <h3 className="leading-snug font-medium break-words">{item.title}</h3>
                {!section && (
                  <p className="text-xs text-muted-foreground">
                    {SECTION_LABELS[item.section]}
                  </p>
                )}
                {fields.length > 0 && (
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {fields.map((field) => (
                      <div key={field.label} className="flex gap-1">
                        <dt className="text-muted-foreground">{field.label}:</dt>
                        <dd className="break-words">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
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
                <ItemImages
                  itemId={item.id}
                  updatedAt={item.updated_at}
                  title={item.title}
                />
                {item.tags.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {item.tags.map((t) => `#${t}`).join(' ')}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(item.updated_at)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 md:h-8"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => openItemForm(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 md:h-8"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setDeletingItem(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
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

      <ItemFormModal
        open={itemFormOpen}
        item={editingItem}
        projectId={project.id}
        defaultSection={section || 'market'}
        projects={projectOptions}
        existingTags={existingTags}
        onClose={() => setItemFormOpen(false)}
        onSaved={(saved, info) => {
          setItemFormOpen(false)
          if (info.movedTo) {
            setNotice(`Moved “${saved.title}” to ${info.movedTo}.`)
          }
          void load()
        }}
      />

      <DeleteItemModal
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onDeleted={() => {
          setDeletingItem(null)
          void load()
        }}
      />
    </>
  )
}