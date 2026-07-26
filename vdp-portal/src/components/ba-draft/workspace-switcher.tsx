'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { productApi } from '@/lib/product-api'
import type { Workspace } from '@/lib/ba-draft/fixtures/types'
import { FolderOpen } from 'lucide-react'

export function WorkspaceSwitcher({ workspaces, currentWorkspaceId }: { workspaces: Workspace[]; currentWorkspaceId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0]

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === currentWorkspaceId) return
    setPendingId(workspaceId)
    try {
      await productApi.post('/ba-control/workspace', { workspaceId })
      // See PersonaSwitcher — workspace-scoped product queries are cached
      // client-side by react-query and must be invalidated explicitly.
      await queryClient.invalidateQueries()
      startTransition(() => router.refresh())
    } finally {
      setPendingId(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="workspace-switcher"
        className="flex items-center gap-2 h-9 px-3 rounded-md hover:bg-slate-100 transition-colors text-sm font-medium"
        disabled={isPending}
      >
        <FolderOpen className="h-4 w-4" />
        <span>{current.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              data-testid={`workspace-option-${ws.id}`}
              className="cursor-pointer"
              onClick={() => switchWorkspace(ws.id)}
              disabled={pendingId === ws.id}
            >
              {ws.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
