"use server"

import { redirect } from "next/navigation"
import { db, must } from "@/lib/db"
import { verifyToken } from "@/lib/session-token"

/** The Approve button on the email link's page: the signed token is the permission. */
export async function approveFromLink(form: FormData) {
  const token = String(form.get("token") ?? "")
  const payload = await verifyToken(token, "approve")
  if (!payload) redirect("/approve")
  must(await db().from("users").update({ status: "approved" }).eq("id", payload.uid).eq("status", "pending"))
  redirect(`/approve?token=${encodeURIComponent(token)}&done=1`)
}
