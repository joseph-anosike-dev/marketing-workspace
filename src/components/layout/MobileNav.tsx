import { Ellipsis, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { isMoreActive, moreNavItems, primaryNavItems } from '@/app/navigation'
import { cn } from '@/lib/utils'

const tabClass =
  'flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * The phone's bottom bar: three main tabs and a More button. More opens a
 * sheet built on the browser's <dialog>, so the Android back button, the
 * Escape key and keyboard focus all behave like any other dialog in the app.
 */
export function MobileNav() {
  const { pathname } = useLocation()
  const sheet = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const moreActive = isMoreActive(pathname)

  function openSheet() {
    sheet.current?.showModal()
    setOpen(true)
  }

  function closeSheet() {
    sheet.current?.close()
  }

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {primaryNavItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(tabClass, isActive ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={openSheet}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={cn(tabClass, moreActive ? 'text-foreground' : 'text-muted-foreground')}
            >
              <Ellipsis className="size-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={sheet}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        // The sheet has no padding of its own, so a click on the dialog
        // element itself can only be a click on the dark backdrop.
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSheet()
        }}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-2xl border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50 md:hidden"
      >
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-2 flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold">
              More
            </h2>
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Close"
              className="-m-2 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="More">
            <ul className="space-y-1">
              {moreNavItems.map(({ to, label, icon: Icon, hint }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={closeSheet}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-14 items-center gap-3 rounded-md px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                      )
                    }
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{label}</span>
                      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  )
}
