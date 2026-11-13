"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_PATH, SESSION_COOKIE } from "@/lib/session-cookie"

export async function signInDemo() {
  ;(await cookies()).set(SESSION_COOKIE, "demo", { httpOnly: true, sameSite: "lax", path: COOKIE_PATH, maxAge: 60 * 60 * 24 * 30 })
  redirect("/")
}

export async function signOut() {
  ;(await cookies()).delete({ name: SESSION_COOKIE, path: COOKIE_PATH })
  redirect("/login")
}
