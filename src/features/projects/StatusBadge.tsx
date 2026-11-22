import type { ProjectStatus } from '@/types'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === 'active') return null
  return (
    <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      Archived
    </span>
  )
}