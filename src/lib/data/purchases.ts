import "server-only"
import { db, must } from "@/lib/db"
import { num, round2 } from "@/lib/money"
import type { Purchase, PurchaseItem, PurchaseRow } from "./types"

const sumItems = (items: { qty: unknown; unit_cost_usd: unknown }[]) => round2(items.reduce((s, i) => s + num(i.qty) * num(i.unit_cost_usd), 0))

export async function listPurchases(): Promise<PurchaseRow[]> {
  const rows = must(
    await db()
      .from("purchases")
      .select("id, number, date, payment_status, sent_to_inventory, suppliers(name), purchase_items(qty, unit_cost_usd)")
      .order("number", { ascending: false }),
  ) as unknown as (Omit<PurchaseRow, "supplier_name" | "total_usd"> & { suppliers: { name: string } | null; purchase_items: { qty: string; unit_cost_usd: string }[] })[]
  return rows.map(({ suppliers, purchase_items, ...r }) => ({ ...r, supplier_name: suppliers?.name ?? null, total_usd: sumItems(purchase_items) }))
}

export async function getPurchase(id: string): Promise<Purchase | null> {
  const { data } = await db()
    .from("purchases")
    .select("*, supplier:suppliers(*), purchase_items(id, description, qty, unit_cost_usd, sort)")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  const items: PurchaseItem[] = [...data.purchase_items]
    .sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
    .map((i: Record<string, unknown>) => ({ id: i.id as string, description: i.description as string, qty: num(i.qty), unit_cost_usd: num(i.unit_cost_usd) }))
  return {
    id: data.id,
    number: data.number,
    date: data.date,
    supplier_id: data.supplier_id,
    supplier: data.supplier,
    payment_status: data.payment_status,
    amount_paid_usd: num(data.amount_paid_usd),
    sent_to_inventory: data.sent_to_inventory,
    notes: data.notes,
    items,
    total_usd: sumItems(items),
  }
}

export async function nextPurchaseNumber() {
  const { data } = await db().from("purchases").select("number").order("number", { ascending: false }).limit(1).maybeSingle()
  return (data?.number ?? 0) + 1
}
