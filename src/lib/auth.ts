import "server-only"
import { cookies } from "next/headers"

// Sign-in for now is a single demo account: a cookie. Later the admin will create users with
// usernames and passwords; this file is the one place to change.
export const SESSION_COOKIE = "uk-session"

export async function getSession() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value
  return value ? { user: value } : null
}
