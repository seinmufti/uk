"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getT } from "@/i18n/server"
import { getSession, IS_DEMO } from "@/lib/auth"
import { db, must } from "@/lib/db"
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

export type FormState = { error?: string }

/** Username (any case) + password. Only approved accounts get in. */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT()
  const username = String(form.get("username") ?? "").trim()
  const password = String(form.get("password") ?? "")
  if (!username || !password) return { error: t("auth.fillAll") }
  const user = must(await db().from("users").select("id, username, password_hash, status, is_admin").ilike("username", username.replace(/[%_\\]/g, "\\$&")).maybeSingle())
  if (!user || !(await checkPassword(password, user.password_hash))) return { error: t("auth.wrong") }
  if (user.status !== "approved") return { error: t("auth.rejected") }
  await startSession(user.id, user.username, user.is_admin)
  redirect("/")
}

export async function signOut() {
  ;(await cookies()).delete({ name: SESSION_COOKIE, path: COOKIE_PATH })
  redirect("/login")
}

// ---- Accounts (admins only, from the Accounts page). Nobody can sign up: the admin makes every account. ----

async function asAdmin<T>(work: (me: { userId: string }) => Promise<T>): Promise<ActionResult> {
  const me = await getSession()
  if (!me?.admin) return { ok: false, error: "Only an admin can do this." }
  try {
    await work(me)
    revalidatePath("/accounts")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const Username = z.string().trim().regex(/^[A-Za-z0-9_.-]{3,30}$/)
const Password = z.string().min(8)

export async function createAccount(input: { username: string; password: string; admin: boolean }): Promise<ActionResult> {
  const t = await getT()
  return asAdmin(async () => {
    const username = Username.safeParse(input.username)
    if (!username.success) throw new Error(t("auth.badUsername"))
    if (!Password.safeParse(input.password).success) throw new Error(t("auth.shortPassword"))
    const res = await db()
      .from("users")
      .insert({ username: username.data, password_hash: await hashPassword(input.password), status: "approved", is_admin: !!input.admin })
    if (res.error) throw new Error(t(res.error.code === "23505" ? "auth.taken" : "auth.failed"))
  })
}

export async function setAccountPassword(id: string, password: string): Promise<ActionResult> {
  const t = await getT()
  return asAdmin(async () => {
    if (!Password.safeParse(password).success) throw new Error(t("auth.shortPassword"))
    must(await db().from("users").update({ password_hash: await hashPassword(password) }).eq("id", id))
  })
}

/** Block (they are signed out at once) or let back in. */
export async function setAccountStatus(id: string, status: "approved" | "rejected"): Promise<ActionResult> {
  return asAdmin(async (me) => {
    if (id === me.userId) throw new Error("You can't block your own account.")
    must(await db().from("users").update({ status }).eq("id", id))
  })
}

export async function setAccountAdmin(id: string, admin: boolean): Promise<ActionResult> {
  return asAdmin(async (me) => {
    if (id === me.userId) throw new Error("You can't change your own admin rights.")
    must(await db().from("users").update({ is_admin: admin }).eq("id", id))
  })
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  return asAdmin(async (me) => {
    if (id === me.userId) throw new Error("You can't delete your own account.")
    must(await db().from("users").delete().eq("id", id))
  })
}
