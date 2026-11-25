import { Outlet } from 'react-router-dom'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b bg-card px-4 md:hidden">
          <span className="text-base font-semibold">Re-Search</span>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  )
}