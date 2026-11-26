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
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/directory', label: 'Tools', icon: Wrench },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/prompts', label: 'Prompts', icon: ListChecks },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/vault', label: 'Vault', icon: Archive },
  { to: '/settings', label: 'Settings', icon: Settings },
]