import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import { BackupPanel } from '@/features/backup/BackupPanel'
import { WipeDataPanel } from './WipeDataPanel'

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Back up, restore, recover or erase your workspace."
      />
      <div className="max-w-2xl space-y-6">
        <BackupPanel />
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Trash</h2>
          <p className="text-sm text-muted-foreground">
            Restore deleted projects and findings, or delete them for good to free
            up storage.
          </p>
          <Link to="/trash" className={buttonVariants({ variant: 'outline' })}>
            Open Trash
          </Link>
        </section>
        <WipeDataPanel />
      </div>
    </>
  )
}
