import { ArrowLeft, ExternalLink, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { projectsRepo, tagsRepo, toolsRepo } from '@/data/repositories'
import type { CategoryWithCount } from '@/data/repositories/directory-types'
import { ItemFormModal } from '@/features/projects/ItemFormModal'
import { describeError } from '@/lib/describeError'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SECTION_LABELS, type Project, type TagWithCount } from '@/types'
import {
  RESEARCH_TYPES,
  buildSourceUrl,
  getResearchType,
  missingInputHint,
  type ResearchType,
} from './sources'

export function LaunchpadPage() {
  const { section } = useParams()
  const type = getResearchType(section)

  if (!type) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Research type not found</h1>
        <Link to="/discover" className="mt-2 inline-block underline">
          See all research types
        </Link>
      </div>
    )
  }
  // The key gives each research type fresh page state.
  return <Launchpad key={type.section} type={type} />
}

function Launchpad({ type }: { type: ResearchType }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''

  // The box keeps its own text so typing never lags; the address follows shortly after.
  const [text, setText] = useState(urlQuery)
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [version, setVersion] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const wanted = text.trim()
    if (wanted === urlQuery) return
    const timer = window.setTimeout(() => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (wanted) next.set('q', wanted)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 250)
    return () => window.clearTimeout(timer)
  }, [text, urlQuery, setSearchParams])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      toolsRepo.listCategories(),
      projectsRepo.list(),
      tagsRepo.list({ includeArchived: true }),
    ])
      .then(([cats, activeProjects, allTags]) => {
        if (cancelled) return
        setCategories(cats)
        setProjects(activeProjects)
        setTags(allTags)
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(describeError(e))
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const query = text.trim()
  const switchSuffix = query ? `?q=${encodeURIComponent(query)}` : ''
  const relatedCategories = type.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is CategoryWithCount => c !== undefined)

  return (
    <>
      <Link
        to="/discover"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All research types
      </Link>

      <PageHeader title={SECTION_LABELS[type.section]} description={type.summary} />

      <nav aria-label="Research types" className="mb-6 flex flex-wrap gap-2">
        {RESEARCH_TYPES.map((other) => {
          const active = other.section === type.section
          return (
            <Link
              key={other.section}
              to={`/discover/${other.section}${switchSuffix}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
              )}
            >
              {SECTION_LABELS[other.section]}
            </Link>
          )
        })}
      </nav>

      <div className="max-w-3xl space-y-8">
        {notice && (
          <p role="status" className="text-sm text-green-700">
            {notice}{' '}
            <Link to="/vault" className="underline">
              Open the Vault
            </Link>
          </p>
        )}
        {loadError && (
          <p role="alert" className="text-sm text-red-700">
            Could not load your tools and projects: {loadError}
          </p>
        )}

        <section aria-labelledby="launchpad-links" className="space-y-3">
          <h2 id="launchpad-links" className="font-semibold">
            Open on the web
          </h2>
          <div>
            <label htmlFor="launchpad-query" className="mb-1 block text-sm font-medium">
              {type.queryLabel}
            </label>
            <input
              id="launchpad-query"
              type="text"
              autoComplete="off"
              maxLength={200}
              placeholder={type.queryPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm sm:h-10"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Links open in a new tab. Pages that need no search are always available.
            </p>
          </div>

          <ul className="divide-y rounded-lg border">
            {type.sources.map((source) => {
              const href = buildSourceUrl(source, text)
              return (
                <li
                  key={source.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{source.name}</p>
                    <p className="text-sm text-muted-foreground">{source.note}</p>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Open
                      <ExternalLink className="size-4" aria-hidden="true" />
                      <span className="sr-only">
                        {source.name} in a new tab
                      </span>
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {missingInputHint(source)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="launchpad-tools" className="space-y-3">
          <h2 id="launchpad-tools" className="font-semibold">
            Tools for this research
          </h2>
          {relatedCategories.length > 0 ? (
            <ul className="space-y-2">
              {relatedCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/directory?category=${encodeURIComponent(category.id)}`}
                    className="underline"
                  >
                    {category.name}
                  </Link>{' '}
                  <span className="text-sm text-muted-foreground">
                    ({plural(category.count, 'tool')})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link to="/directory" className="underline">
                Browse all tools
              </Link>
            </p>
          )}
        </section>

        <section aria-labelledby="launchpad-save" className="space-y-3">
          <h2 id="launchpad-save" className="font-semibold">
            Save what you find
          </h2>
          <p className="text-sm text-muted-foreground">
            Add a {SECTION_LABELS[type.section].toLowerCase()} finding without leaving
            this page.
          </p>
          <Button type="button" className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add finding
          </Button>
        </section>
      </div>

      <ItemFormModal
        open={formOpen}
        item={null}
        projectId={null}
        defaultSection={type.section}
        projects={projects}
        existingTags={tags}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false)
          setNotice(`Saved “${saved.title}”.`)
          setVersion((v) => v + 1)
        }}
      />
    </>
  )
}
