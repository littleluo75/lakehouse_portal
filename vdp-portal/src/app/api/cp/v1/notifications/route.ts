import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(async ({ persona }) => {
  const items = fixtureStore.get().notifications.filter((n) => n.personaId === persona.id)
  return NextResponse.json({ items })
})
