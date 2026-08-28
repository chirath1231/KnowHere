import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value
  const { pathname } = request.nextUrl

  const protectedRoutes = [
    "/",
    "/folder",
    "/trash",
    "/subscription",
    "/settings"
  ]

  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/folder/:path*",
    "/trash/:path*",
    "/subscription/:path*",
    "/settings/:path*"
  ],
}