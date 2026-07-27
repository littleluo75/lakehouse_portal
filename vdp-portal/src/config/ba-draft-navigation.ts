import type { PersonaRole } from '@/lib/ba-draft/fixtures/types'

export interface BaNavItem {
  title: string
  href: string
  icon: string
  group: 'Overview' | 'Workspaces' | 'Data Sources' | 'Data Flows' | 'Catalog & Governance' | 'Query & Consumption' | 'Operations' | 'Administration'
  roles: PersonaRole[] // empty = all personas
}

export const baNavItems: BaNavItem[] = [
  { title: 'Tổng quan', href: '/', icon: 'LayoutDashboard', group: 'Overview', roles: [] },
  { title: 'Workspaces', href: '/workspaces', icon: 'FolderOpen', group: 'Workspaces', roles: [] },
  { title: 'Connections', href: '/connections', icon: 'Database', group: 'Data Sources', roles: [] },
  { title: 'Pipelines', href: '/pipelines', icon: 'GitBranch', group: 'Data Flows', roles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] },
  { title: 'Dataset publication', href: '/datasets', icon: 'Layers', group: 'Data Flows', roles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] },
  { title: 'Data Catalog', href: '/catalog', icon: 'BookOpen', group: 'Catalog & Governance', roles: [] },
  { title: 'Access & approvals', href: '/access-requests', icon: 'ShieldCheck', group: 'Catalog & Governance', roles: [] },
  { title: 'Authorized Query', href: '/query', icon: 'Code2', group: 'Query & Consumption', roles: ['DataEngineer', 'DataSteward', 'Analyst', 'PIIReader', 'TenantAdmin', 'SuperAdmin'] },
  { title: 'Operations', href: '/operations', icon: 'Activity', group: 'Operations', roles: [] },
  { title: 'Audit', href: '/audit', icon: 'ScrollText', group: 'Operations', roles: ['TenantAdmin', 'SuperAdmin'] },
  { title: 'Quản trị', href: '/admin', icon: 'Settings', group: 'Administration', roles: ['SuperAdmin'] },
]
