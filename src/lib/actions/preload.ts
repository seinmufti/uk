"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { isEnabled } from "@/lib/features"

/** Every invoice, purchase and receipt page (newest first), for the app to load as soon as it opens. */
export async function documentPages(): Promise<string[]> {
  if (!(await getSession())) return []
  const tables = (["invoices", "purchases", "receipts"] as const).filter(isEnabled)
  const lists = await Promise.all(
    tables.map(async (table) => {
      const { data } = await db().from(table).select("id").order("created_at", { ascending: false })
      return (data ?? []).map((r: { id: string }) => `/${table}/${r.id}`)
    }),
  )
  return lists.flat()
}
