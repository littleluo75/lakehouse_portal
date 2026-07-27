'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, GitBranch, Database, Code2, BookOpen,
  FolderOpen, Activity, Settings, ShieldCheck, Layers, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { baNavItems } from '@/config/ba-draft-navigation'
import type { PersonaRole } from '@/lib/ba-draft/fixtures/types'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GitBranch, Database, Code2, BookOpen,
  FolderOpen, Activity, Settings, ShieldCheck, Layers, ScrollText,
}

export function BaSidebar({ personaRole }: { personaRole: PersonaRole }) {
  const pathname = usePathname()

  const visibleItems = baNavItems.filter(
    (item) => item.roles.length === 0 || item.roles.includes(personaRole)
  )
  const groups = [...new Set(visibleItems.map((item) => item.group))]

  return (
    <aside className="ba-sidebar">
      <div className="brand-block">
        <div className="brand-mark">VD</div>
        <div><strong>VNPT Data Cloud</strong><span>Enterprise Data Platform</span></div>
      </div>
      <div className="sidebar-context"><span>Environment</span><strong>BA EVALUATION · LOCAL</strong></div>
      <nav data-testid="ba-nav">
        {groups.map((group) => <div className="nav-group" key={group}>
          <div className="nav-group-label">{group}</div>
          {visibleItems.filter((item) => item.group === group).map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-item-${item.href.replace(/\//g, '') || 'home'}`}
              className={cn(
                'nav-link', isActive && 'active'
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.title}
            </Link>
          )
        })}</div>)}
      </nav>
      <div className="sidebar-footer"><ShieldCheck /><div><strong>Mock boundary active</strong><span>/api/cp/v1 only</span></div></div>
    </aside>
  )
}
