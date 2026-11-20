import "server-only"
import { cookies } from "next/headers"
import { cache } from "react"
import { activeAccount } from "./account-check"
import { verifyToken } from "./session-token"
import { SESSION_COOKIE } from "./session-cookie"

export { SESSION_COOKIE } from "./session-cookie"

/** The demo deployment (…/demo) signs in with one button; the live app with accounts. */
export const IS_DEMO = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").endsWith("/demo")

/** Who is signed in (from the signed cookie, and still allowed in), or null. Once per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const s = await verifyToken(token, "session")
  if (!s) return null
  if (s.uid === "demo") return IS_DEMO ? { userId: "demo", username: "Demo", admin: false } : null
  // Blocked or deleted since signing in: out; admin rights follow the account, not the cookie
  const account = await activeAccount(s.uid)
  return account ? { userId: s.uid, username: account.username, admin: account.admin } : null
})
