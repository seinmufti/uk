import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "uk-session"

/**
 * Pages send signed-out people to /login themselves (the (app) layout), because Next's redirect() writes a
 * relative Location that survives nordlyssolutions.com's proxy; a relative redirect from here crashes on
 * Vercel. This only blocks writes (server actions are POSTs) from people who aren't signed in.
 */
export function proxy(request: NextRequest) {
  const signedIn = !!request.cookies.get(SESSION_COOKIE)?.value
  if (!signedIn && request.method !== "GET" && request.method !== "HEAD" && request.nextUrl.pathname !== "/login") {
    return new NextResponse(null, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\.(?:png|jpg|svg|webp|ico)$).*)"],
}
