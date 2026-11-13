import "server-only"
import { db, must } from "@/lib/db"
import type { Party } from "./types"

export type PartyTable = "customers" | "suppliers"

/** Active ones only by default (for pickers); `all` also returns archived ones (the customers / suppliers pages). */
export async function listParties(table: PartyTable, opts?: { all?: boolean }): Promise<Party[]> {
  let q = db().from(table).select("id, name, phone, address, notes, archived").order("name")
  if (!opts?.all) q = q.eq("archived", false)
  return must(await q)
}
