'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, GitBranch, Database, Code2, BookOpen,
  FolderOpen, Activity, Zap, BarChart3, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from '@/config/navigation'
import type { KeycloakRole } from '@/types'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GitBranch, Database, Code2, BookOpen,
  FolderOpen, Activity, Zap, BarChart3, Settings,
}

interface SidebarProps {
  userRoles?: KeycloakRole[]
}

export function Sidebar({ userRoles = [] }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(item =>
    item.roles.length === 0 || item.roles.some(r => userRoles.includes(r))
  )

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-slate-100 flex flex-col">
      <div className="flex items-center h-16 px-6 border-b border-slate-700">
        <span className="font-bold text-lg tracking-tight">VDP Portal</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map(item => {
          const Icon = iconMap[item.icon]
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
