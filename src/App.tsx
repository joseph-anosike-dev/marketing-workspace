import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { useAndroidBackButton } from '@/app/useAndroidBackButton'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DevPage } from '@/features/dev/DevPage'
import { DirectoryPage } from '@/features/directory/DirectoryPage'
import { ToolDetailPage } from '@/features/directory/ToolDetailPage'
import { DiscoverPage } from '@/features/discover/DiscoverPage'
import { LaunchpadPage } from '@/features/discover/LaunchpadPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TrashPage } from '@/features/trash/TrashPage'
import { VaultPage } from '@/features/vault/VaultPage'

export default function App() {
  useAndroidBackButton()

  useEffect(() => {
    // Ask the browser not to clear our saved data when disk space is low.
    void navigator.storage?.persist?.()
  }, [])

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="directory/:toolId" element={<ToolDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="discover/:section" element={<LaunchpadPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="dev" element={<DevPage />} />
        <Route
          path="*"
          element={
            <div>
              <h1 className="text-2xl font-semibold">Page not found</h1>
              <Link to="/" className="mt-2 inline-block underline">
                Go to the dashboard
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  )
}