import { NextResponse, type NextRequest } from "next/server"
import { featureOf, isEnabled } from "@/lib/features"
import { SESSION_COOKIE } from "@/lib/session-cookie"
import { verifyToken } from "@/lib/session-token"

// Pages anyone may post to (signing in, asking for an account, approving one from the email link)
const OPEN = ["/login", "/signup", "/approve"]

/**
 * Pages send signed-out people to /login themselves (the (app) layout), because Next's redirect() writes a
 * relative Location that survives nordlyssolutions.com's proxy; a relative redirect from here crashes on
 * Vercel. This only blocks writes (server actions are POSTs) without a valid signed sign-in cookie, and
 * sections this deployment has switched off.
 */
export async function proxy(request: NextRequest) {
  // The path inside the app: without the base path (/uk, /uk/demo, /demo) if it's there
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const raw = request.nextUrl.pathname
  const path = base && raw.startsWith(base) ? raw.slice(base.length) || "/" : raw
  // Locally the root app hands /demo over to the demo dev server, which checks it itself
  if (!base && (path === "/demo" || path.startsWith("/demo/"))) return NextResponse.next()
  const feature = featureOf(path)
  if (feature && !isEnabled(feature)) return new NextResponse("Not found", { status: 404 })
  if (request.method === "GET" || request.method === "HEAD" || OPEN.includes(path)) return NextResponse.next()
  // Writes need a genuine (signed) sign-in cookie
  if (!(await verifyToken(request.cookies.get(SESSION_COOKIE)?.value, "session"))) return new NextResponse(null, { status: 401 })
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\.(?:png|jpg|svg|webp|ico)$).*)"],
}
