"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { fail, type ActionResult } from "./result"

const PartySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
})
export type PartyInput = z.input<typeof PartySchema>
type Table = "customers" | "suppliers"

const refresh = () => {
  for (const p of ["/customers", "/suppliers", "/invoices", "/purchases"]) revalidatePath(p, "layout")
}

export async function saveParty(table: Table, id: string | null, input: PartyInput): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const values = PartySchema.parse(input)
    const row = id
      ? must(await db().from(table).update(values).eq("id", id).select("id, name").single())
      : must(await db().from(table).insert(values).select("id, name").single())
    refresh()
    return { ok: true, ...row }
  } catch (e) {
    return fail(e instanceof z.ZodError ? e.issues[0].message : e)
  }
}

export async function deleteParty(table: Table, id: string): Promise<ActionResult> {
  try {
    must(await db().from(table).delete().eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
