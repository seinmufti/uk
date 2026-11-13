import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "uk-session"
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/**
 * A relative redirect within the app. Relative on purpose: behind nordlyssolutions.com's proxy the request
 * arrives at the Vercel address, and an absolute redirect would send people there instead.
 */
const goTo = (path: string) => new Response(null, { status: 307, headers: { Location: `${BASE_PATH}${path}` } })

// Not signed in → the sign-in page. Signed in and on the sign-in page → the app.
export function proxy(request: NextRequest) {
  const signedIn = !!request.cookies.get(SESSION_COOKIE)?.value
  const path = request.nextUrl.pathname // without the base path
  const onLogin = path === "/login"
  if (!signedIn && !onLogin) return goTo("/login")
  if (signedIn && (onLogin || path === "/")) return goTo("/invoices")
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
}
