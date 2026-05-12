import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
  '/verify-email',
  '/verify-email-pending',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = getSessionCookie(request)

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
    return NextResponse.next()
  }

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  if (!sessionCookie && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const authPaths = ['/login', '/forgot-password', '/reset-password', '/accept-invitation']
  if (
    sessionCookie &&
    authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
