import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { PERSONA_COOKIE } from '@/lib/ba-draft/session'
import { PERSONAS } from '@/lib/ba-draft/fixtures/seed'

export const POST = createBaDraftHandler(async ({ request }) => {
  const body = await request.json().catch(() => null)
  const personaId = body?.personaId
  const persona = PERSONAS.find((p) => p.id === personaId)
  if (!persona) {
    return NextResponse.json({ error: 'Unknown persona id', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const response = NextResponse.json({ persona })
  response.cookies.set(PERSONA_COOKIE, persona.id, { path: '/', sameSite: 'lax' })
  return response
})
