import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ItemImages } from '@/features/projects/ItemImages'
import { describeMetadata } from '@/features/projects/sectionFields'
import { formatDate } from '@/lib/format'
import { SECTION_LABELS, type ResearchItemView } from '@/types'

const BODY_PREVIEW_LENGTH = 280

function preview(text: string): string {
  return text.length > BODY_PREVIEW_LENGTH
    ? `${text.slice(0, BODY_PREVIEW_LENGTH).trimEnd()}…`
    : text
}

interface ItemCardProps {
  item: ResearchItemView
  /** The finding's project, or null when it has none. */
  project: { id: string; name: string; archived: boolean } | null
  onEdit: (item: ResearchItemView) => void
  onDelete: (item: ResearchItemView) => void
  onSelectTag: (tag: string) => void
}

export function ItemCard({
  item,
  project,
  onEdit,
  onDelete,
  onSelectTag,
}: ItemCardProps) {
  const fields = describeMetadata(item.section, item.metadata)

  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h2 className="leading-snug font-medium break-words">{item.title}</h2>

      <p className="text-xs text-muted-foreground">
        {SECTION_LABELS[item.section]} ·{' '}
        {project ? (
          <Link to={`/projects/${project.id}`} className="underline">
            {project.name}
            {project.archived ? ' (archived)' : ''}
          </Link>
        ) : (
          'No project'
        )}
      </p>

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

      <ItemImages itemId={item.id} updatedAt={item.updated_at} title={item.title} />

      {item.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onSelectTag(tag)}
                title={`Show only #${tag}`}
                className="min-h-8 rounded-full border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                #{tag}
              </button>
            </li>
          ))}
        </ul>
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
            onClick={() => onEdit(item)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 md:h-8"
            aria-label={`Delete ${item.title}`}
            onClick={() => onDelete(item)}
          >
            Delete
          </Button>
        </div>
      </div>
    </li>
  )
}