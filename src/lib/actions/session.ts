"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SESSION_COOKIE } from "@/lib/auth"

export async function signInDemo() {
  ;(await cookies()).set(SESSION_COOKIE, "demo", { httpOnly: true, sameSite: "lax", path: process.env.NEXT_PUBLIC_BASE_PATH || "/", maxAge: 60 * 60 * 24 * 30 })
  redirect("/invoices")
}

export async function signOut() {
  ;(await cookies()).delete({ name: SESSION_COOKIE, path: process.env.NEXT_PUBLIC_BASE_PATH || "/" })
  redirect("/login")
}
