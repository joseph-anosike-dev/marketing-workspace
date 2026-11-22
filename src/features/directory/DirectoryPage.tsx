import { Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { bookmarksRepo, toolsRepo } from '@/data/repositories'
import type {
  CategoryWithCount,
  ToolView,
} from '@/data/repositories/directory-types'
import { cn } from '@/lib/utils'
import { FiltersPanel } from './FiltersPanel'
import {
  countActive,
  readFilters,
  toToolFilter,
  writeFilters,
  type DirectoryFilters,
} from './filters'
import { ToolCards } from './ToolCards'
import { ToolTable } from './ToolTable'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  const toolFilter = useMemo(() => toToolFilter(filters), [filters])

  // The search box keeps its own text so typing never lags;
  // the address is updated shortly after you stop typing.
  const [searchText, setSearchText] = useState(filters.search)
  const [tools, setTools] = useState<ToolView[] | null>(null)
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [totalTools, setTotalTools] = useState<number | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const updateFilters = useCallback(
    (patch: Partial<DirectoryFilters>) => {
      setSearchParams((previous) => writeFilters(previous, patch), {
        replace: true,
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    const wanted = searchText.trim()
    if (wanted === filters.search) return
    const timer = window.setTimeout(() => updateFilters({ search: wanted }), 250)
    return () => window.clearTimeout(timer)
  }, [searchText, filters.search, updateFilters])

  // Loaded once: categories with counts, the total, and how many are saved.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      toolsRepo.listCategories(),
      toolsRepo.list(),
      bookmarksRepo.listToolIds(),
    ])
      .then(([cats, all, saved]) => {
        if (cancelled) return
        setCategories(cats)
        setTotalTools(all.length)
        setSavedCount(saved.length)
      })
      .catch((e) => {
        if (!cancelled) setError(messageOf(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Reloaded whenever the filters change. The flag stops a slow, older
  // search from overwriting the results of a newer one.
  useEffect(() => {
    let cancelled = false
    toolsRepo
      .list(toolFilter)
      .then((result) => {
        if (cancelled) return
        setTools(result)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(messageOf(e))
      })
    return () => {
      cancelled = true
    }
  }, [toolFilter])

  async function toggleBookmark(tool: ToolView) {
    try {
      const nowBookmarked = await bookmarksRepo.toggle(tool.id)
      // Update in place so the tool stays visible in "Saved only" and an
      // accidental un-save can be undone. The list refreshes on the next filter change.
      setTools((previous) =>
        previous
          ? previous.map((t) =>
              t.id === tool.id ? { ...t, bookmarked: nowBookmarked } : t,
            )
          : previous,
      )
      setSavedCount((count) => count + (nowBookmarked ? 1 : -1))
    } catch (e) {
      setError(messageOf(e))
    }
  }

  function clearFilters() {
    setSearchText('')
    setSearchParams({}, { replace: true })
  }

  const activeCount = countActive(filters)
  const canClear = activeCount > 0 || searchText.trim() !== ''
  const onlySavedFilter =
    filters.savedOnly && activeCount === 1 && filters.search === ''

  return (
    <>
      <PageHeader
        title="Marketing Tools Directory"
        description="Search, filter and bookmark marketing tools and research sites."
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="relative mb-4 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search tools"
          placeholder="Search by name, use case or category"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-11 w-full rounded-md border bg-background pr-3 pl-9 text-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center gap-2 lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="directory-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>

          <FiltersPanel
            id="directory-filters"
            className={cn(
              filtersOpen ? 'mt-3 block' : 'hidden',
              'lg:mt-0 lg:block',
            )}
            categories={categories}
            totalTools={totalTools ?? 0}
            savedCount={savedCount}
            filters={filters}
            canClear={canClear}
            onChange={updateFilters}
            onClear={clearFilters}
          />
        </div>

        <div className="min-w-0 space-y-3">
          {tools && totalTools !== null && totalTools > 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Showing {tools.length} of {totalTools} tools
            </p>
          )}

          {tools === null && !error && (
            <p className="text-sm text-muted-foreground">Loading directory…</p>
          )}

          {totalTools === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              The directory is empty. Reload the page. If it stays empty, open the
              browser console (F12) and send me any red error text.
            </div>
          )}

          {tools && tools.length === 0 && totalTools !== 0 && (
            <div className="rounded-lg border border-dashed p-6 text-sm">
              {onlySavedFilter && savedCount === 0 ? (
                <p>
                  You haven’t saved any tools yet. Use the bookmark button on any
                  tool to keep it here.
                </p>
              ) : (
                <>
                  <p>No tools match these filters.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          )}

          {tools && tools.length > 0 && (
            <>
              <ToolTable
                tools={tools}
                onToggleBookmark={(tool) => void toggleBookmark(tool)}
                onSelectCategory={(categoryId) => updateFilters({ categoryId })}
              />
              <ToolCards
                tools={tools}
                onToggleBookmark={(tool) => void toggleBookmark(tool)}
                onSelectCategory={(categoryId) => updateFilters({ categoryId })}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}