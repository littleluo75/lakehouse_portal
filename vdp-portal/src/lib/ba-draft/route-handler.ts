import { NextResponse } from 'next/server'
import { isBaDraftMode } from './config'
import { installServerNetworkGuard } from './net-guard'
import { getBaDraftIdentityFromRequest, type BaDraftIdentity } from './session'
import type { PersonaRole } from './fixtures/types'

export interface BaDraftHandlerContext extends BaDraftIdentity {
  request: Request
  params: Record<string, string>
}

type Handler = (ctx: BaDraftHandlerContext) => Promise<Response> | Response

/**
 * Wraps every /api/cp/v1 mock Route Handler. Keeps handlers thin: this
 * factory is the one place that (a) enforces BA Draft mode is on — the
 * mock surface must not exist otherwise, (b) installs the outbound network
 * guard, and (c) resolves the caller's mock persona/workspace identity.
 */
export function createBaDraftHandler(handler: Handler, options?: { allowedRoles?: PersonaRole[] }) {
  return async (request: Request, routeCtx?: { params: Promise<Record<string, string>> }) => {
    if (!isBaDraftMode()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    installServerNetworkGuard()

    const identity = getBaDraftIdentityFromRequest(request)
    if (options?.allowedRoles && !options.allowedRoles.includes(identity.persona.role)) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const params = routeCtx ? await routeCtx.params : {}
    try {
      return await handler({ ...identity, request, params })
    } catch (err) {
      console.error('[ba-draft] handler error:', err instanceof Error ? err.message : err)
      return NextResponse.json({ error: 'Internal mock error' }, { status: 500 })
    }
  }
}
