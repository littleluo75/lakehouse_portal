'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { productApi } from '@/lib/product-api'
import type { Persona } from '@/lib/ba-draft/fixtures/types'
import { UserCircle } from 'lucide-react'

export function PersonaSwitcher({ personas, currentPersonaId }: { personas: Persona[]; currentPersonaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const current = personas.find((p) => p.id === currentPersonaId) ?? personas[0]

  async function switchPersona(personaId: string) {
    if (personaId === currentPersonaId) return
    setPendingId(personaId)
    try {
      await productApi.post('/ba-control/persona', { personaId })
      startTransition(() => router.refresh())
    } finally {
      setPendingId(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="persona-switcher"
        className="flex items-center gap-2 h-9 px-3 rounded-md hover:bg-slate-100 transition-colors text-sm font-medium"
        disabled={isPending}
      >
        <UserCircle className="h-4 w-4" />
        <span>{current.name}</span>
        <span className="text-xs text-slate-500">({current.role})</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Mock persona (BA Draft)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {personas.map((persona) => (
          <DropdownMenuItem
            key={persona.id}
            data-testid={`persona-option-${persona.id}`}
            className="cursor-pointer flex flex-col items-start"
            onClick={() => switchPersona(persona.id)}
            disabled={pendingId === persona.id}
          >
            <span className="text-sm font-medium">{persona.name}</span>
            <span className="text-xs text-slate-500">{persona.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
