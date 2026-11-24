import { PageHeader } from '@/components/layout/PageHeader'
import { BackupPanel } from '@/features/backup/BackupPanel'
import { WipeDataPanel } from './WipeDataPanel'

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Back up, restore or erase your workspace."
      />
      <div className="max-w-2xl space-y-6">
        <BackupPanel />
        <WipeDataPanel />
      </div>
    </>
  )
}
