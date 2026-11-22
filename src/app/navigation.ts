import {
  Archive,
  Compass,
  FolderKanban,
  LayoutDashboard,
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
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/vault', label: 'Vault', icon: Archive },
]