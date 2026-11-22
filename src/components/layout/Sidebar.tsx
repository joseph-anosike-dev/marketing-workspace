import { NavLink } from 'react-router-dom'
import { navItems } from '@/app/navigation'
import { cn } from '@/lib/utils'

export function Sidebar() {
  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-card">
      <div className="flex h-14 items-center border-b px-5">
        <span className="text-base font-semibold">Marketing Workspace</span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4 text-xs text-muted-foreground">
        Local mode: data stays in this browser
      </div>
    </aside>
  )
}