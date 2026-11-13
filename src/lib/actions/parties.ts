"use server"

import { tracked } from "./tracked"
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

/** What still points at a customer / supplier, e.g. ["2 invoices", "1 receipt"]. */
async function countLinks(table: Table, id: string) {
  const col = table === "customers" ? "customer_id" : "supplier_id"
  const sources = table === "customers" ? ([["invoices", "invoice"], ["receipts", "receipt"], ["debts", "debt"]] as const) : ([["purchases", "purchase"], ["receipts", "receipt"], ["debts", "debt"]] as const)
  const counts = await Promise.all(sources.map(async ([t]) => (await db().from(t).select("id", { count: "exact", head: true }).eq(col, id)).count ?? 0))
  return sources.flatMap(([, noun], i) => (counts[i] ? [`${counts[i]} ${noun}${counts[i] > 1 ? "s" : ""}`] : []))
}

const refresh = () => {
  for (const p of ["/customers", "/suppliers", "/invoices", "/purchases"]) revalidatePath(p, "layout")
}

async function savePartyAction(table: Table, id: string | null, input: PartyInput): Promise<ActionResult<{ id: string; name: string }>> {
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

async function deletePartyAction(table: Table, id: string): Promise<ActionResult> {
  try {
    // Never orphan documents: anything linked means archive instead
    const links = await countLinks(table, id)
    if (links.length) throw new Error(`Can't delete: has ${links.join(", ")}. Archive it instead.`)
    must(await db().from(table).delete().eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Hides a customer / supplier from lists and pickers (or brings it back); its records stay linked. */
async function setPartyArchivedAction(table: Table, id: string, archived: boolean): Promise<ActionResult> {
  try {
    must(await db().from(table).update({ archived }).eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// Each action is one change in the history (undo / redo as a unit)
export const saveParty = tracked(savePartyAction)
export const deleteParty = tracked(deletePartyAction)
export const setPartyArchived = tracked(setPartyArchivedAction)
