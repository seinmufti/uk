import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "uk-session"

// Not signed in → the sign-in page. Signed in and on the sign-in page → the app.
export function proxy(request: NextRequest) {
  const signedIn = !!request.cookies.get(SESSION_COOKIE)?.value
  const onLogin = request.nextUrl.pathname === "/login"
  if (!signedIn && !onLogin) return NextResponse.redirect(new URL("/login", request.url))
  if (signedIn && (onLogin || request.nextUrl.pathname === "/")) return NextResponse.redirect(new URL("/invoices", request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\.(?:png|jpg|svg|webp|ico)$).*)"],
}
