import { Link } from 'react-router-dom'
import {
  BookmarkButton,
  CategoryChips,
  PricingBadge,
  TechniqueBadge,
  VisitLink,
  type ToolListProps,
} from './ToolParts'

export function ToolCards({
  tools,
  onToggleBookmark,
  onSelectCategory,
}: ToolListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:hidden">
      {tools.map((tool) => (
        <li
          key={tool.id}
          className="flex flex-col gap-3 rounded-lg border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="leading-snug font-medium">
                <Link to={`/directory/${tool.id}`} className="hover:underline">
                  {tool.name}
                </Link>
              </h2>
              {tool.kind === 'technique' && (
                <div className="mt-1">
                  <TechniqueBadge />
                </div>
              )}
            </div>
            <BookmarkButton
              bookmarked={tool.bookmarked}
              toolName={tool.name}
              onToggle={() => onToggleBookmark(tool)}
            />
          </div>

          <p className="text-sm text-muted-foreground">{tool.use_case}</p>

          <CategoryChips
            categories={tool.categories}
            onSelect={onSelectCategory}
          />

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <PricingBadge pricing={tool.pricing} />
            <VisitLink url={tool.url} toolName={tool.name} />
          </div>
        </li>
      ))}
    </ul>
  )
}