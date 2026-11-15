"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getT } from "@/i18n/server"
import { getSession, IS_DEMO } from "@/lib/auth"
import { db, must } from "@/lib/db"
import { sendApprovalRequest } from "@/lib/mail"
import { checkPassword, hashPassword } from "@/lib/passwords"
import { COOKIE_PATH, SESSION_COOKIE } from "@/lib/session-cookie"
import { DAY, signToken } from "@/lib/session-token"
import type { ActionResult } from "./result"

const SESSION_DAYS = 30

async function startSession(uid: string, name: string, admin = false) {
  const token = await signToken({ kind: "session", uid, name, admin, exp: Date.now() + SESSION_DAYS * DAY })
  ;(await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: COOKIE_PATH, maxAge: SESSION_DAYS * 24 * 60 * 60 })
}

/** Demo deployment only: one button, no account. */
export async function signInDemo() {
  if (!IS_DEMO) redirect("/login")
  await startSession("demo", "Demo")
  redirect("/")
}

export type FormState = { error?: string; done?: boolean }

/** Username (any case) + password. Only approved accounts get in. */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT()
  const username = String(form.get("username") ?? "").trim()
  const password = String(form.get("password") ?? "")
  if (!username || !password) return { error: t("auth.fillAll") }
  const user = must(await db().from("users").select("id, username, password_hash, status, is_admin").ilike("username", username.replace(/[%_\\]/g, "\\$&")).maybeSingle())
  if (!user || !(await checkPassword(password, user.password_hash))) return { error: t("auth.wrong") }
  if (user.status === "pending") return { error: t("auth.pending") }
  if (user.status !== "approved") return { error: t("auth.rejected") }
  await startSession(user.id, user.username, user.is_admin)
  redirect("/")
}

const SignUp = z.object({
  email: z.string().trim().email(),
  username: z.string().trim().regex(/^[A-Za-z0-9_.-]{3,30}$/),
  password: z.string().min(8),
})

/** Creates a pending account and emails the admin a link to approve it. */
export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT()
  const parsed = SignUp.safeParse({ email: form.get("email"), username: form.get("username"), password: form.get("password") })
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0]
    return { error: t(field === "email" ? "auth.badEmail" : field === "username" ? "auth.badUsername" : "auth.shortPassword") }
  }
  const { email, username, password } = parsed.data
  // The admin's own sign-up (ADMIN_EMAIL) is approved straight away and can approve everyone else
  const isAdmin = !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
  const res = await db()
    .from("users")
    .insert({ email, username, password_hash: await hashPassword(password), status: isAdmin ? "approved" : "pending", is_admin: isAdmin })
    .select("id")
    .single()
  if (res.error) return { error: t(res.error.code === "23505" ? "auth.taken" : "auth.failed") }
  if (!isAdmin) {
    const token = await signToken({ kind: "approve", uid: res.data.id, exp: Date.now() + 14 * DAY })
    const h = await headers()
    const origin = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`
    await sendApprovalRequest({ username, email, approveUrl: `${origin}/approve?token=${encodeURIComponent(token)}` }).catch(() => false)
  }
  return { done: true }
}

export async function signOut() {
  ;(await cookies()).delete({ name: SESSION_COOKIE, path: COOKIE_PATH })
  redirect("/login")
}

/** Admins only: approve or block an account from the Accounts page. */
export async function setAccountStatus(id: string, status: "approved" | "rejected"): Promise<ActionResult> {
  const me = await getSession()
  if (!me?.admin) return { ok: false, error: "Only an admin can do this." }
  if (id === me.userId) return { ok: false, error: "You can't change your own account." }
  must(await db().from("users").update({ status }).eq("id", id))
  revalidatePath("/accounts")
  return { ok: true }
}
