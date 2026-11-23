import { Plus, Search, SlidersHorizontal, Tags } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { itemsRepo, projectsRepo, tagsRepo } from '@/data/repositories'
import { DeleteItemModal } from '@/features/projects/DeleteItemModal'
import { ItemFormModal } from '@/features/projects/ItemFormModal'
import { describeError } from '@/lib/describeError'
import { cn } from '@/lib/utils'
import {
  SECTIONS,
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
  type Section,
  type TagWithCount,
} from '@/types'
import {
  NO_PROJECT,
  SORTS,
  SORT_LABELS,
  countActive,
  readVaultFilters,
  sortItems,
  toItemFilter,
  writeVaultFilters,
  type VaultFilters,
  type VaultSort,
} from './filters'
import { ItemCard } from './ItemCard'
import { TagManagerModal, type TagChange } from './TagManagerModal'

const selectClass = 'h-11 w-full rounded-md border bg-background px-3 text-sm lg:h-10'

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  )
}

export function VaultPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => readVaultFilters(searchParams), [searchParams])
  const itemFilter = useMemo(() => toItemFilter(filters), [filters])

  // The search box keeps its own text so typing never lags;
  // the address is updated shortly after you stop typing.
  const [searchText, setSearchText] = useState(filters.search)
  const [items, setItems] = useState<ResearchItemView[] | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [allTags, setAllTags] = useState<TagWithCount[]>([])
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ResearchItemView | null>(null)
  const [deleting, setDeleting] = useState<ResearchItemView | null>(null)
  const [tagsOpen, setTagsOpen] = useState(false)

  const updateFilters = useCallback(
    (patch: Partial<VaultFilters>) => {
      setSearchParams((previous) => writeVaultFilters(previous, patch), {
        replace: true,
      })
    },
    [setSearchParams],
  )

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const wanted = searchText.trim()
    if (wanted === filters.search) return
    const timer = window.setTimeout(() => updateFilters({ search: wanted }), 250)
    return () => window.clearTimeout(timer)
  }, [searchText, filters.search, updateFilters])

  // Reloaded whenever a filter changes or something is saved. The flag stops a
  // slow, older request from overwriting the results of a newer one.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      itemsRepo.list(itemFilter),
      itemsRepo.list({ includeArchived: filters.includeArchived }),
      projectsRepo.list({ includeArchived: true }),
      tagsRepo.list({ includeArchived: filters.includeArchived }),
      tagsRepo.list({ includeArchived: true }),
    ])
      .then(([found, everything, allProjects, visibleTags, everyTag]) => {
        if (cancelled) return
        setItems(found)
        setTotal(everything.length)
        setProjects(allProjects)
        setTags(visibleTags)
        setAllTags(everyTag)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(describeError(e))
      })
    return () => {
      cancelled = true
    }
  }, [itemFilter, filters.includeArchived, version])

  const sorted = useMemo(() => sortItems(items ?? [], filters.sort), [items, filters.sort])
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const projectOptions = useMemo(() => {
    const byName = (a: Project, b: Project) => a.name.localeCompare(b.name)
    return [
      ...projects.filter((p) => p.status === 'active').sort(byName),
      ...projects.filter((p) => p.status === 'archived').sort(byName),
    ]
  }, [projects])

  const archivedCount = projects.filter((p) => p.status === 'archived').length
  const activeCount = countActive(filters)
  const canClear =
    activeCount > 0 || searchText.trim() !== '' || filters.sort !== 'updated'

  // A tag chosen from the address might no longer be in the list; keep it selectable.
  const tagOptions =
    filters.tag && !tags.some((t) => t.name === filters.tag)
      ? [...tags, { id: 'selected', owner_id: '', name: filters.tag, created_at: '', count: 0 }]
      : tags

  // Projects a finding can be placed in: active ones, plus its own current project.
  const formProjects = projects.filter(
    (p) => p.status === 'active' || p.id === editing?.project_id,
  )
  const defaultProjectId = projects.some(
    (p) => p.id === filters.project && p.status === 'active',
  )
    ? filters.project
    : null

  function openForm(item: ResearchItemView | null) {
    setNotice(null)
    setEditing(item)
    setFormOpen(true)
  }

  function clearFilters() {
    setSearchText('')
    setSearchParams({}, { replace: true })
  }

  function handleTagChanged(change: TagChange) {
    if (filters.tag === change.from) updateFilters({ tag: change.to ?? '' })
    reload()
  }

  const noFindingsAtAll = items !== null && total === 0
  const nothingMatches = items !== null && total !== null && total > 0 && items.length === 0

  return (
    <>
      <PageHeader
        title="Research Vault"
        description="Everything you have saved, searchable in one place."
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xl flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search findings"
            placeholder="Search titles, notes, links and tags"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-11 w-full rounded-md border bg-background pr-3 pl-9 text-sm sm:h-10"
          />
        </div>
        <Button type="button" className="h-11 gap-2 sm:h-10" onClick={() => openForm(null)}>
          <Plus className="size-4" aria-hidden="true" />
          Add finding
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center gap-2 lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="vault-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>

          <div
            id="vault-filters"
            className={cn(
              'space-y-4 rounded-lg border bg-card p-4',
              filtersOpen ? 'mt-3 block' : 'hidden',
              'lg:mt-0 lg:block',
            )}
          >
            <Field id="vault-section" label="Section">
              <select
                id="vault-section"
                className={selectClass}
                value={filters.section}
                onChange={(e) => updateFilters({ section: e.target.value as Section | '' })}
              >
                <option value="">All sections</option>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SECTION_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="vault-project" label="Project">
              <select
                id="vault-project"
                className={selectClass}
                value={filters.project}
                onChange={(e) => updateFilters({ project: e.target.value })}
              >
                <option value="">All projects</option>
                <option value={NO_PROJECT}>No project (Vault only)</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.status === 'archived' ? ' (archived)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="vault-tag" label="Tag">
              <select
                id="vault-tag"
                className={selectClass}
                value={filters.tag}
                onChange={(e) => updateFilters({ tag: e.target.value })}
              >
                <option value="">All tags</option>
                {tagOptions.map((t) => (
                  <option key={t.id} value={t.name}>
                    #{t.name} ({t.count})
                  </option>
                ))}
              </select>
            </Field>

            <Field id="vault-sort" label="Sort by">
              <select
                id="vault-sort"
                className={selectClass}
                value={filters.sort}
                onChange={(e) => updateFilters({ sort: e.target.value as VaultSort })}
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            {(archivedCount > 0 || filters.includeArchived) && (
              <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.includeArchived}
                  onChange={(e) => updateFilters({ includeArchived: e.target.checked })}
                  className="size-4"
                />
                Include archived projects ({archivedCount})
              </label>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canClear}
                onClick={clearFilters}
              >
                Clear filters
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setTagsOpen(true)}
              >
                <Tags className="size-4" aria-hidden="true" />
                Manage tags
              </Button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          {notice && (
            <p role="status" className="rounded-md border bg-muted/50 p-3 text-sm">
              {notice}
            </p>
          )}

          {items !== null && total !== null && total > 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Showing {items.length} of {total} findings
            </p>
          )}

          {items === null && !error && (
            <p className="text-sm text-muted-foreground">Loading findings…</p>
          )}

          {noFindingsAtAll && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Your Vault is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a finding here, or inside a project, and it will appear in this list.
              </p>
              <Button type="button" className="mt-4" onClick={() => openForm(null)}>
                Add your first finding
              </Button>
            </div>
          )}

          {nothingMatches && (
            <div className="rounded-lg border border-dashed p-6 text-sm">
              <p>No findings match these filters.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          )}

          {sorted.length > 0 && (
            <ul className="grid gap-3 2xl:grid-cols-2">
              {sorted.map((item) => {
                const project = item.project_id ? projectById.get(item.project_id) : undefined
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    project={
                      project
                        ? {
                            id: project.id,
                            name: project.name,
                            archived: project.status === 'archived',
                          }
                        : null
                    }
                    onEdit={openForm}
                    onDelete={setDeleting}
                    onSelectTag={(tag) => updateFilters({ tag })}
                  />
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <ItemFormModal
        open={formOpen}
        item={editing}
        projectId={defaultProjectId}
        defaultSection={filters.section || 'market'}
        projects={formProjects}
        existingTags={allTags}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setFormOpen(false)
          setNotice(`Saved “${saved.title}”.`)
          reload()
        }}
      />

      <DeleteItemModal
        item={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null)
          setNotice('Finding deleted.')
          reload()
        }}
      />

      <TagManagerModal
        open={tagsOpen}
        tags={allTags}
        onClose={() => setTagsOpen(false)}
        onChanged={handleTagChanged}
      />
    </>
  )
}