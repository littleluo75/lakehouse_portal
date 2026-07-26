import type { PersonaRole } from '@/lib/ba-draft/fixtures/types'

export interface BaNavItem {
  title: string
  href: string
  icon: string
  roles: PersonaRole[] // empty = all personas
}

export const baNavItems: BaNavItem[] = [
  { title: 'Tổng quan', href: '/', icon: 'LayoutDashboard', roles: [] },
  { title: 'Workspaces', href: '/workspaces', icon: 'FolderOpen', roles: [] },
  { title: 'Connections', href: '/connections', icon: 'Database', roles: [] },
  { title: 'Access requests', href: '/access-requests', icon: 'ShieldCheck', roles: [] },
  { title: 'Pipelines', href: '/pipelines', icon: 'GitBranch', roles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] },
  { title: 'Datasets', href: '/datasets', icon: 'Layers', roles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] },
  { title: 'Data Catalog', href: '/catalog', icon: 'BookOpen', roles: [] },
  { title: 'SQL Editor', href: '/query', icon: 'Code2', roles: ['DataEngineer', 'DataSteward', 'Analyst', 'PIIReader', 'TenantAdmin', 'SuperAdmin'] },
  { title: 'Operations', href: '/operations', icon: 'Activity', roles: [] },
  { title: 'Audit', href: '/audit', icon: 'ScrollText', roles: ['TenantAdmin', 'SuperAdmin'] },
  { title: 'Quản trị', href: '/admin', icon: 'Settings', roles: ['SuperAdmin'] },
]
