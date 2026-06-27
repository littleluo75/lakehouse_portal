import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { KeycloakRole } from '@/types'

const ROUTE_PERMISSIONS: Record<string, KeycloakRole[]> = {
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

export default auth((req) => {
  const path = req.nextUrl.pathname
  const isLoggedIn = !!req.auth
  const isAuthPage = path.startsWith('/login') || path.startsWith('/403')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(route)) {
      const userRoles = (req.auth?.user?.roles ?? []) as KeycloakRole[]
      const hasAccess = roles.some((r) => userRoles.includes(r))
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/403', req.url))
      }
      break
    }
  }
})

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}
