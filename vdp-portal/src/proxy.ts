import { NextResponse, type NextRequest } from 'next/server'
import { isBaDraftMode } from '@/lib/ba-draft/config'
import { getBaDraftIdentityFromRequest } from '@/lib/ba-draft/session'
import type { PersonaRole } from '@/lib/ba-draft/fixtures/types'
import type { KeycloakRole } from '@/types'

const LEGACY_ROUTE_PERMISSIONS: Record<string, KeycloakRole[]> = {
  '/workflows':     ['DE', 'Op', 'Admin', 'SuperAdmin'],
  '/catalog':       ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'],
  '/query':         ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'],
  '/notebooks':     ['DE', 'DS', 'Admin', 'SuperAdmin'],
  '/storage':       ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'],
  '/streams':       ['DE', 'Op', 'Admin', 'SuperAdmin'],
  '/jobs':          ['DE', 'Op', 'Admin', 'SuperAdmin'],
  '/observability': ['Op', 'Admin', 'SuperAdmin', 'PM'],
  '/admin':         ['SuperAdmin'],
}

const BA_DRAFT_ROUTE_PERMISSIONS: Record<string, PersonaRole[]> = {
  '/admin': ['SuperAdmin'],
}

/**
 * BA Draft mode branch: no real login (mock persona is always "logged in"
 * as the cookie-selected persona, defaulting to SuperAdmin). Legacy
 * `/api/*` compatibility endpoints must never egress in this mode — only
 * `/api/cp/*` (the ProductApi boundary) is reachable.
 */
function handleBaDraftMode(req: NextRequest): NextResponse | undefined {
  const path = req.nextUrl.pathname

  if (path.startsWith('/api/')) {
    if (path.startsWith('/api/cp/')) return undefined
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const identity = getBaDraftIdentityFromRequest(req)
  for (const [route, roles] of Object.entries(BA_DRAFT_ROUTE_PERMISSIONS)) {
    if (path.startsWith(route) && !roles.includes(identity.persona.role)) {
      return NextResponse.redirect(new URL('/403', req.url))
    }
  }
  return undefined
}

export default async function proxy(req: NextRequest) {
  if (isBaDraftMode()) {
    return handleBaDraftMode(req) ?? NextResponse.next()
  }

  // Normal (non-BA) mode: unchanged legacy behavior. API routes were never
  // covered by this middleware before (they do their own validateApiAuth),
  // so pass them straight through.
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Loaded dynamically so BA Draft mode never imports next-auth/Keycloak.
  const { auth } = await import('@/lib/auth')
  const session = await auth()

  const path = req.nextUrl.pathname
  const isLoggedIn = !!session
  const isAuthPage = path.startsWith('/login') || path.startsWith('/403')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  for (const [route, roles] of Object.entries(LEGACY_ROUTE_PERMISSIONS)) {
    if (path.startsWith(route)) {
      const userRoles = (session?.user?.roles ?? []) as KeycloakRole[]
      const hasAccess = roles.some((r) => userRoles.includes(r))
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/403', req.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
