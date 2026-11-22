import { Link } from 'react-router-dom'
import {
  BookmarkButton,
  CategoryChips,
  PricingBadge,
  TechniqueBadge,
  VisitLink,
  type ToolListProps,
} from './ToolParts'

export function ToolTable({
  tools,
  onToggleBookmark,
  onSelectCategory,
}: ToolListProps) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border bg-card xl:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Marketing tools and websites</caption>
        <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Tool
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Categories
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Pricing
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => (
            <tr key={tool.id} className="border-b align-top last:border-0">
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/directory/${tool.id}`}
                    className="font-medium hover:underline"
                  >
                    {tool.name}
                  </Link>
                  {tool.kind === 'technique' && <TechniqueBadge />}
                </div>
                <p className="mt-0.5 text-muted-foreground">{tool.use_case}</p>
              </td>
              <td className="max-w-56 px-4 py-3">
                <CategoryChips
                  categories={tool.categories}
                  onSelect={onSelectCategory}
                />
              </td>
              <td className="px-4 py-3">
                <PricingBadge pricing={tool.pricing} />
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  <VisitLink url={tool.url} toolName={tool.name} />
                  <BookmarkButton
                    bookmarked={tool.bookmarked}
                    toolName={tool.name}
                    onToggle={() => onToggleBookmark(tool)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}