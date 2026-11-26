import {
  Archive,
  Compass,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** On phones this item lives in the "More" menu instead of the tab bar. */
  more?: boolean
  /** One line shown under the name in the More menu. */
  hint?: string
}

/** Every destination, in the order the desktop sidebar lists them. */
export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/directory', label: 'Tools', icon: Wrench, more: true, hint: 'Marketing tools directory' },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/prompts', label: 'Prompts', icon: ListChecks, more: true, hint: 'Research guides and optional AI prompts' },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/vault', label: 'Vault', icon: Archive, more: true, hint: 'Every finding you have saved' },
  { to: '/settings', label: 'Settings', icon: Settings, more: true, hint: 'Backup, restore and your data' },
]

/** The phone tab bar: three tabs, plus the More button. */
export const primaryNavItems = navItems.filter((item) => !item.more)

/** What the phone's More menu lists. */
export const moreNavItems = navItems.filter((item) => item.more)

/** True when the current page belongs to something in the More menu. */
export function isMoreActive(pathname: string): boolean {
  return moreNavItems.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
}
