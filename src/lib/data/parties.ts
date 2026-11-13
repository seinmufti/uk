import "server-only"
import { db, must } from "@/lib/db"
import type { Party } from "./types"

export type PartyTable = "customers" | "suppliers"

export async function listParties(table: PartyTable): Promise<Party[]> {
  return must(await db().from(table).select("id, name, phone, address, notes").order("name"))
}
