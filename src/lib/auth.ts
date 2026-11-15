import "server-only"
import { cookies } from "next/headers"
import { verifyToken } from "./session-token"
import { SESSION_COOKIE } from "./session-cookie"

export { SESSION_COOKIE } from "./session-cookie"

/** The demo deployment (…/demo) signs in with one button; the live app with accounts. */
export const IS_DEMO = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").endsWith("/demo")

/** Who is signed in (from the signed cookie), or null. */
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const s = await verifyToken(token, "session")
  return s ? { userId: s.uid, username: s.name, admin: !!s.admin } : null
}
