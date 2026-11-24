import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { plural } from '@/lib/format'
import { SECTION_LABELS } from '@/types'
import { RESEARCH_TYPES } from './sources'

export function DiscoverPage() {
  return (
    <>
      <PageHeader
        title="Discover & Research"
        description="Pick a type of research. Each launchpad opens the right places on the web with your search already filled in."
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RESEARCH_TYPES.map((type) => (
          <li key={type.section}>
            <Link
              to={`/discover/${type.section}`}
              className="block h-full rounded-lg border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <h2 className="font-semibold">{SECTION_LABELS[type.section]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{type.summary}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {plural(type.sources.length, 'link')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
