import { cookies } from 'next/headers'
import { PERSONAS, WORKSPACES } from './fixtures/seed'
import type { Persona, Workspace } from './fixtures/types'

/**
 * Mock BA Draft identity — a cookie-selected persona/workspace, entirely
 * independent from next-auth/Keycloak. Never touches real IdP state.
 */
export const PERSONA_COOKIE = 'ba_draft_persona'
export const WORKSPACE_COOKIE = 'ba_draft_workspace'

export const DEFAULT_PERSONA_ID = PERSONAS[0].id
export const DEFAULT_WORKSPACE_ID = WORKSPACES[0].id

export interface BaDraftIdentity {
  persona: Persona
  workspace: Workspace
}

export async function getBaDraftIdentity(): Promise<BaDraftIdentity> {
  const store = await cookies()
  const personaId = store.get(PERSONA_COOKIE)?.value ?? DEFAULT_PERSONA_ID
  const workspaceId = store.get(WORKSPACE_COOKIE)?.value ?? DEFAULT_WORKSPACE_ID

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0]
  const workspace = WORKSPACES.find((w) => w.id === workspaceId) ?? WORKSPACES[0]

  return { persona, workspace }
}

/** Reads identity from a request's Cookie header — used inside Route Handlers. */
export function getBaDraftIdentityFromRequest(request: Request): BaDraftIdentity {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const parsed = parseCookieHeader(cookieHeader)
  const personaId = parsed[PERSONA_COOKIE] ?? DEFAULT_PERSONA_ID
  const workspaceId = parsed[WORKSPACE_COOKIE] ?? DEFAULT_WORKSPACE_ID

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0]
  const workspace = WORKSPACES.find((w) => w.id === workspaceId) ?? WORKSPACES[0]

  return { persona, workspace }
}

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    out[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1))
  }
  return out
}
