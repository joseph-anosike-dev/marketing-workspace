import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import type {
  ToolCategoryInfo,
  ToolView,
} from '@/data/repositories/directory-types'
import { cn } from '@/lib/utils'
import type { Pricing } from '@/types'
import { PRICING_LABEL } from './labels'

export interface ToolListProps {
  tools: ToolView[]
  onToggleBookmark: (tool: ToolView) => void
  onSelectCategory: (categoryId: string) => void
}

const PRICING_STYLES: Record<Pricing, string> = {
  free: 'bg-green-100 text-green-800',
  freemium: 'bg-blue-100 text-blue-800',
  paid: 'bg-amber-100 text-amber-900',
  unverified: 'bg-muted text-muted-foreground',
}

export function PricingBadge({ pricing }: { pricing: Pricing }) {
  return (
    <span
      title={pricing === 'unverified' ? 'Pricing has not been checked yet' : undefined}
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
        PRICING_STYLES[pricing],
      )}
    >
      {PRICING_LABEL[pricing]}
    </span>
  )
}

export function TechniqueBadge() {
  return (
    <span
      title="A method rather than a product"
      className="inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
    >
      Technique
    </span>
  )
}

interface BookmarkButtonProps {
  bookmarked: boolean
  toolName: string
  onToggle: () => void
  /** Show the words "Save" / "Saved" next to the icon. */
  withLabel?: boolean
}

export function BookmarkButton({
  bookmarked,
  toolName,
  onToggle,
  withLabel = false,
}: BookmarkButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      aria-label={withLabel ? undefined : `Bookmark ${toolName}`}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        withLabel ? 'h-10 border px-4' : 'size-11',
        bookmarked && 'text-primary',
      )}
    >
      {bookmarked ? (
        <BookmarkCheck className="size-5" aria-hidden="true" />
      ) : (
        <Bookmark className="size-5" aria-hidden="true" />
      )}
      {withLabel && (bookmarked ? 'Saved' : 'Save')}
    </button>
  )
}

export function VisitLink({
  url,
  toolName,
  className,
}: {
  url: string
  toolName: string
  className?: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${toolName} website (opens in a new tab)`}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      Visit
      <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  )
}

export function CategoryChips({
  categories,
  onSelect,
}: {
  categories: ToolCategoryInfo[]
  onSelect: (categoryId: string) => void
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {categories.map((category) => (
        <li key={category.id}>
          <button
            type="button"
            onClick={() => onSelect(category.id)}
            title={`Show only ${category.name}`}
            className="min-h-8 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {category.name}
          </button>
        </li>
      ))}
    </ul>
  )
}