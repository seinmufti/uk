"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { isEnabled } from "@/lib/features"

const ids = async (table: string) => {
  const { data } = await db().from(table).select("id").order("created_at", { ascending: false })
  return (data ?? []).map((r: { id: string }) => r.id)
}

/**
 * Every page with its own data, for the app to load as soon as it opens: invoices first (the list,
 * the new-invoice form, then each invoice and its edit form, newest first), then everything else.
 */
export async function appPages(): Promise<{ invoices: string[]; rest: string[] }> {
  if (!(await getSession())) return { invoices: [], rest: [] }
  const on = (f: Parameters<typeof isEnabled>[0]) => isEnabled(f)
  const [invoices, purchases, receipts, employees] = await Promise.all([
    on("invoices") ? ids("invoices") : [],
    on("purchases") ? ids("purchases") : [],
    on("receipts") ? ids("receipts") : [],
    on("hr") ? ids("employees") : [],
  ])
  return {
    invoices: on("invoices") ? ["/invoices", "/invoices/new", ...invoices.flatMap((id) => [`/invoices/${id}`, `/invoices/${id}/edit`])] : [],
    rest: [
      ...(on("receipts") ? ["/receipts/new", ...receipts.map((id) => `/receipts/${id}`)] : []),
      ...(on("purchases") ? ["/purchases/new", ...purchases.flatMap((id) => [`/purchases/${id}`, `/purchases/${id}/edit`])] : []),
      ...(on("inventory") ? ["/inventory?tab=asset", "/inventory?tab=stock", "/inventory?tab=capital"] : []),
      ...employees.map((id) => `/hr/${id}`),
    ],
  }
}
