import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'
import { DevPage } from '@/features/dev/DevPage'
import { DirectoryPage } from '@/features/directory/DirectoryPage'
import { ToolDetailPage } from '@/features/directory/ToolDetailPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'

const placeholders = [
  {
    path: 'discover',
    title: 'Discover & Research',
    description: 'Launchpads for market, customer, competitor and ad research.',
    stage: 'the Discovery stage',
  },
  {
    path: 'vault',
    title: 'Research Vault',
    description: 'Everything you have saved, searchable in one place.',
    stage: 'the Vault stage',
  },
]

export default function App() {
  useEffect(() => {
    // Ask the browser not to clear our saved data when disk space is low.
    void navigator.storage?.persist?.()
  }, [])

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <PlaceholderPage
              title="Dashboard"
              description="Recent projects, saved findings and quick actions."
              stage="the Dashboard stage (last)"
            />
          }
        />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="directory/:toolId" element={<ToolDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        {placeholders.map((p) => (
          <Route
            key={p.path}
            path={p.path}
            element={
              <PlaceholderPage
                title={p.title}
                description={p.description}
                stage={p.stage}
              />
            }
          />
        ))}
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