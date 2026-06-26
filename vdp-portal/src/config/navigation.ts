import type { NavItem } from '@/types'

export const navItems: NavItem[] = [
  { title: 'Tổng quan', href: '/', icon: 'LayoutDashboard', roles: [] },
  { title: 'Workflows', href: '/workflows', icon: 'GitBranch', roles: ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Data Catalog', href: '/catalog', icon: 'Database', roles: ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'] },
  { title: 'SQL Editor', href: '/query', icon: 'Code2', roles: ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'] },
  { title: 'Notebooks', href: '/notebooks', icon: 'BookOpen', roles: ['DE', 'DS', 'Admin', 'SuperAdmin'] },
  { title: 'Storage', href: '/storage', icon: 'FolderOpen', roles: ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Streams', href: '/streams', icon: 'Activity', roles: ['DE', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Spark Jobs', href: '/jobs', icon: 'Zap', roles: ['DE', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Observability', href: '/observability', icon: 'BarChart3', roles: ['Op', 'Admin', 'SuperAdmin', 'PM'] },
  { title: 'Quản trị', href: '/admin', icon: 'Settings', roles: ['SuperAdmin'] },
]
