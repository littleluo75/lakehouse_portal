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

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-slate-100 flex flex-col" style={{ top: '2rem' }}>
      <div className="flex items-center h-16 px-6 border-b border-slate-700">
        <span className="font-bold text-lg tracking-tight">VNPT Data Cloud Platform</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" data-testid="ba-nav">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-item-${item.href.replace(/\//g, '') || 'home'}`}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
