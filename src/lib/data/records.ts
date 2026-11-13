import "server-only"
import { db, must } from "@/lib/db"
import { num } from "@/lib/money"
import type { Debt, DebtDirection, Expense, InventoryItem, InventoryKind } from "./types"

export async function listInventory(kind?: InventoryKind): Promise<InventoryItem[]> {
  let q = db().from("inventory_items").select("*").order("date", { ascending: false })
  if (kind) q = q.eq("kind", kind)
  return must(await q).map((r) => ({ ...r, qty: num(r.qty), value_usd: num(r.value_usd) }))
}

export async function listDebts(direction?: DebtDirection): Promise<Debt[]> {
  let q = db().from("debts").select("*").order("date", { ascending: false })
  if (direction) q = q.eq("direction", direction)
  return must(await q).map((r) => ({ ...r, amount_usd: num(r.amount_usd), paid_usd: num(r.paid_usd) }))
}

export async function listExpenses(range?: { from: string; to: string }): Promise<Expense[]> {
  let q = db().from("expenses").select("*").order("date", { ascending: false })
  if (range) q = q.gte("date", range.from).lte("date", range.to)
  return must(await q).map((r) => ({ ...r, amount_usd: num(r.amount_usd) }))
}

export async function getSettings() {
  const row = must(await db().from("settings").select("*").eq("id", 1).single())
  return { company_name: row.company_name as string, zakat_percent: num(row.zakat_percent) }
}
