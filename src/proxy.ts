import { NextResponse, type NextRequest } from "next/server"
import { featureOf, isEnabled } from "@/lib/features"
import { SESSION_COOKIE } from "@/lib/session-cookie"

/**
 * Pages send signed-out people to /login themselves (the (app) layout), because Next's redirect() writes a
 * relative Location that survives nordlyssolutions.com's proxy; a relative redirect from here crashes on
 * Vercel. This only blocks writes (server actions are POSTs) from people who aren't signed in, and
 * sections this deployment has switched off.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const feature = featureOf(path)
  if (feature && !isEnabled(feature)) return new NextResponse("Not found", { status: 404 })
  const signedIn = !!request.cookies.get(SESSION_COOKIE)?.value
  if (!signedIn && request.method !== "GET" && request.method !== "HEAD" && path !== "/login") {
    return new NextResponse(null, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\.(?:png|jpg|svg|webp|ico)$).*)"],
}
