import { PageHeader } from './PageHeader'

interface PlaceholderPageProps {
  title: string
  description: string
  stage: string
}

export function PlaceholderPage({
  title,
  description,
  stage,
}: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        Placeholder page. This feature is built in {stage}.
      </div>
    </>
  )
}