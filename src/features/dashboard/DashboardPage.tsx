import { Compass, DatabaseBackup, FolderPlus, Plus, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { itemsRepo, projectsRepo, tagsRepo, toolsRepo } from '@/data/repositories'
import type { ToolView } from '@/data/repositories/directory-types'
import { PricingBadge, VisitLink } from '@/features/directory/ToolParts'
import { ItemFormModal } from '@/features/projects/ItemFormModal'
import { ProjectFormModal } from '@/features/projects/ProjectFormModal'
import { describeError } from '@/lib/describeError'
import { formatDate, plural } from '@/lib/format'
import {
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
  type TagWithCount,
} from '@/types'
import { pickSavedTools, summarizeDashboard } from './summary'

interface DashboardData {
  projects: Project[]
  items: ResearchItemView[]
  tools: ToolView[]
  tags: TagWithCount[]
}

function Panel({
  id,
  title,
  action,
  children,
}: {
  id: string
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const quickLinkClass = buttonVariants({ variant: 'outline' })

export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      projectsRepo.list({ includeArchived: true }),
      itemsRepo.list({ includeArchived: true }),
      toolsRepo.list({ bookmarkedOnly: true }),
      tagsRepo.list({ includeArchived: true }),
    ])
      .then(([projects, items, tools, tags]) => {
        if (cancelled) return
        setData({ projects, items, tools, tags })
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(describeError(e))
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const summary = useMemo(
    () => (data ? summarizeDashboard(data.projects, data.items) : null),
    [data],
  )
  const saved = useMemo(() => (data ? pickSavedTools(data.tools) : null), [data])
  const activeProjects = useMemo(
    () => (data ? data.projects.filter((p) => p.status === 'active') : []),
    [data],
  )

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Pick up where you left off, or start something new."
      />

      <div className="max-w-5xl space-y-6">
        {notice && (
          <p role="status" className="text-sm text-green-700">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            Could not load the dashboard: {error}
          </p>
        )}

        <section aria-labelledby="dash-actions">
          <h2 id="dash-actions" className="sr-only">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="gap-2" onClick={() => setItemFormOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add finding
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setProjectFormOpen(true)}
            >
              <FolderPlus className="size-4" aria-hidden="true" />
              New project
            </Button>
            <Link to="/discover" className={quickLinkClass}>
              <Compass className="size-4" aria-hidden="true" />
              Discover
            </Link>
            <Link to="/directory" className={quickLinkClass}>
              <Wrench className="size-4" aria-hidden="true" />
              Browse tools
            </Link>
            <Link to="/settings" className={quickLinkClass}>
              <DatabaseBackup className="size-4" aria-hidden="true" />
              Back up data
            </Link>
          </div>
        </section>

        {!data && !error && <p className="text-sm text-muted-foreground">Loading…</p>}

        {data && summary && saved && (
          <>
            <dl className="grid grid-cols-3 gap-3">
              {[
                ['Projects', summary.projectCount],
                ['Findings', summary.findingCount],
                ['Saved tools', saved.total],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-2xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel
                id="dash-projects"
                title="Recent projects"
                action={
                  <Link to="/projects" className="text-sm underline">
                    All projects
                  </Link>
                }
              >
                {summary.recentProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active projects yet. A project keeps the research for one
                    idea or client together.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {summary.recentProjects.map(({ project, findingCount }) => (
                      <li key={project.id} className="py-2 first:pt-0 last:pb-0">
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-medium break-words underline-offset-2 hover:underline"
                        >
                          {project.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {plural(findingCount, 'finding')} · Updated{' '}
                          {formatDate(project.updated_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel
                id="dash-findings"
                title="Recent findings"
                action={
                  <Link to="/vault" className="text-sm underline">
                    Open the Vault
                  </Link>
                }
              >
                {summary.recentFindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No findings yet. Use Add finding, or open a launchpad in Discover.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {summary.recentFindings.map(({ item, projectName }) => (
                      <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                        <Link
                          to={
                            item.project_id
                              ? `/projects/${item.project_id}`
                              : `/vault?q=${encodeURIComponent(item.title)}`
                          }
                          className="font-medium break-words underline-offset-2 hover:underline"
                        >
                          {item.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {SECTION_LABELS[item.section]} ·{' '}
                          {projectName ? projectName : 'Vault only'} ·{' '}
                          {formatDate(item.updated_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel
              id="dash-tools"
              title="Saved tools"
              action={
                saved.total > 0 ? (
                  <Link to="/directory?saved=1" className="text-sm underline">
                    {saved.total > saved.shown.length
                      ? `All ${saved.total} saved`
                      : 'Open in Tools'}
                  </Link>
                ) : undefined
              }
            >
              {saved.shown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing saved yet. Use the bookmark on any tool in{' '}
                  <Link to="/directory" className="underline">
                    Tools
                  </Link>{' '}
                  to keep it here.
                </p>
              ) : (
                <ul className="divide-y">
                  {saved.shown.map((tool) => (
                    <li
                      key={tool.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/directory/${tool.id}`}
                            className="font-medium break-words underline-offset-2 hover:underline"
                          >
                            {tool.name}
                          </Link>
                          <PricingBadge pricing={tool.pricing} />
                        </p>
                        <p className="text-sm text-muted-foreground">{tool.use_case}</p>
                      </div>
                      <VisitLink url={tool.url} toolName={tool.name} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>

      <ItemFormModal
        open={itemFormOpen}
        item={null}
        projectId={null}
        defaultSection="market"
        projects={activeProjects}
        existingTags={data?.tags ?? []}
        onClose={() => setItemFormOpen(false)}
        onSaved={(saved) => {
          setItemFormOpen(false)
          setNotice(`Saved “${saved.title}”.`)
          setVersion((v) => v + 1)
        }}
      />

      <ProjectFormModal
        open={projectFormOpen}
        project={null}
        onClose={() => setProjectFormOpen(false)}
        onSaved={(saved) => {
          setProjectFormOpen(false)
          navigate(`/projects/${saved.id}`)
        }}
      />
    </>
  )
}
