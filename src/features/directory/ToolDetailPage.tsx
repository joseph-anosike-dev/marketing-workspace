import { ArrowLeft, Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { bookmarksRepo, toolsRepo } from '@/data/repositories'
import type { ToolView } from '@/data/repositories/directory-types'
import {
  BookmarkButton,
  PricingBadge,
  TechniqueBadge,
  VisitLink,
} from './ToolParts'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function ToolDetailPage() {
  const { toolId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // undefined = still loading, null = no such tool
  const [tool, setTool] = useState<ToolView | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)

  useEffect(() => {
    let cancelled = false
    toolsRepo
      .get(toolId)
      .then((result) => {
        if (!cancelled) setTool(result ?? null)
      })
      .catch((e) => {
        if (!cancelled) setError(messageOf(e))
      })
    return () => {
      cancelled = true
    }
  }, [toolId])

  useEffect(() => {
    if (!tool) return
    const previous = document.title
    document.title = `${tool.name} · Marketing Workspace`
    return () => {
      document.title = previous
    }
  }, [tool])

  // "default" means this page was opened directly (for example from a shared
  // link), so there is no previous page of ours to go back to.
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/directory')
  }

  async function toggleBookmark() {
    if (!tool) return
    try {
      const nowBookmarked = await bookmarksRepo.toggle(tool.id)
      setTool({ ...tool, bookmarked: nowBookmarked })
    } catch (e) {
      setError(messageOf(e))
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked; show the link so it can be copied by hand.
      setShowLink(true)
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to directory
    </button>
  )

  if (error) {
    return (
      <>
        {backButton}
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      </>
    )
  }

  if (tool === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (tool === null) {
    return (
      <>
        {backButton}
        <h1 className="mt-4 text-2xl font-semibold">Tool not found</h1>
        <p className="mt-2 text-muted-foreground">
          There is no tool with that address.{' '}
          <Link to="/directory" className="underline">
            Browse the directory
          </Link>
        </p>
      </>
    )
  }

  return (
    <article className="max-w-3xl">
      {backButton}

      <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
        {tool.name}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PricingBadge pricing={tool.pricing} />
        {tool.kind === 'technique' && <TechniqueBadge />}
        <span className="text-sm text-muted-foreground">
          {new URL(tool.url).host}
        </span>
      </div>

      <p className="mt-4 text-base">{tool.use_case}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <VisitLink
          url={tool.url}
          toolName={tool.name}
          className="border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        />
        <BookmarkButton
          bookmarked={tool.bookmarked}
          toolName={tool.name}
          withLabel
          onToggle={() => void toggleBookmark()}
        />
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>

      {showLink && (
        <div className="mt-3">
          <label htmlFor="share-link" className="text-sm text-muted-foreground">
            Copy this link:
          </label>
          <input
            id="share-link"
            readOnly
            value={window.location.href}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        This link opens the tool for anyone who has this app. It does not share your
        saved research.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Where it fits</h2>
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {tool.categories.map((category) => (
            <li key={category.id} className="p-4">
              <Link
                to={`/directory?category=${category.id}`}
                className="font-medium hover:underline"
              >
                {category.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {category.use_case}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {(tool.pricing === 'unverified' || tool.kind === 'technique') && (
        <section className="mt-6 space-y-2 text-sm text-muted-foreground">
          {tool.pricing === 'unverified' && (
            <p>Pricing has not been checked yet. Check the website for current plans.</p>
          )}
          {tool.kind === 'technique' && (
            <p>
              This is a research method rather than a product, so the link opens a
              general site you use in a particular way.
            </p>
          )}
        </section>
      )}
    </article>
  )
}