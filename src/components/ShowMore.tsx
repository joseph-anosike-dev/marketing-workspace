import { Button } from '@/components/ui/button'

interface ShowMoreProps {
  shown: number
  total: number
  onClick: () => void
}

/** "Showing 40 of 1,200" with a button to reveal more. Renders nothing when everything is shown. */
export function ShowMore({ shown, total, onClick }: ShowMoreProps) {
  if (shown >= total) return null
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Showing {shown.toLocaleString()} of {total.toLocaleString()}
      </p>
      <Button type="button" variant="outline" onClick={onClick}>
        Show more
      </Button>
    </div>
  )
}
