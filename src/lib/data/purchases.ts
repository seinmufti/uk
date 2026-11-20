import "server-only"
import { db, must } from "@/lib/db"
import { highestNumberEver } from "./history"
import { num, round6 } from "@/lib/money"
import type { InvoiceItem, Purchase, PurchaseRow } from "./types"

// Purchases come back in the same shape as sales invoices (see Purchase in types.ts)
const lineTotal = (i: { qty: unknown; unit_cost_usd: unknown }) => round6(num(i.qty) * num(i.unit_cost_usd))
const sumItems = (items: { qty: unknown; unit_cost_usd: unknown }[]) => round6(items.reduce((s, i) => s + lineTotal(i), 0))
const afterDiscount = (subtotal: number, discount: unknown) => round6(Math.max(0, subtotal - num(discount)))
/** Paid when bought, plus payments made later on its debt (receipts or the Debts page) */
const paidOf = (upfront: unknown, debts: { paid_usd: unknown }[] | null) => round6(num(upfront) + (debts ?? []).reduce((s, d) => s + num(d.paid_usd), 0))
const statusOf = (total: number, paid: number) => (total > 0 && paid >= total - 0.005 ? "paid" : "unpaid") as "paid" | "unpaid"

export async function listPurchases(): Promise<PurchaseRow[]> {
  const rows = must(
    await db()
      .from("purchases")
      .select("id, number, date, due_date, supplier_id, currency_mode, rate_per_100, amount_paid_usd, discount_usd, sent_to_inventory, suppliers(name), purchase_items(qty, unit_cost_usd), debts(paid_usd)")
      .order("number", { ascending: false }),
  ) as unknown as { id: string; number: number; date: string; due_date: string | null; supplier_id: string | null; currency_mode: Purchase["currency_mode"]; rate_per_100: string; amount_paid_usd: string; discount_usd: string; sent_to_inventory: boolean; suppliers: { name: string } | null; purchase_items: { qty: string; unit_cost_usd: string }[]; debts: { paid_usd: string }[] }[]
  return rows.map((r) => {
    const total = afterDiscount(sumItems(r.purchase_items), r.discount_usd)
    const paid = paidOf(r.amount_paid_usd, r.debts)
    return {
      id: r.id,
      number: r.number,
      date: r.date,
      due_date: r.due_date,
      status: statusOf(total, paid),
      customer_id: r.supplier_id,
      customer_name: r.suppliers?.name ?? null,
      currency_mode: r.currency_mode,
      rate_per_100: num(r.rate_per_100),
      amount_paid_usd: paid,
      total_usd: total,
      sent_to_inventory: r.sent_to_inventory,
    }
  })
}

export async function getPurchase(id: string): Promise<Purchase | null> {
  const { data } = await db()
    .from("purchases")
    .select("*, supplier:suppliers(*), purchase_items(id, description, qty, unit_cost_usd, sort), debts(paid_usd)")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  const items: InvoiceItem[] = [...data.purchase_items]
    .sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
    .map((i: Record<string, unknown>) => ({ id: i.id as string, description: i.description as string, qty: num(i.qty), unit_price_usd: num(i.unit_cost_usd), total_usd: lineTotal(i as { qty: unknown; unit_cost_usd: unknown }) }))
  const subtotal = round6(items.reduce((s, i) => s + i.total_usd, 0))
  const total = afterDiscount(subtotal, data.discount_usd)
  const paid = paidOf(data.amount_paid_usd, data.debts)
  return {
    id: data.id,
    number: data.number,
    date: data.date,
    due_date: data.due_date ?? null,
    customer_id: data.supplier_id,
    customer: data.supplier,
    rate_per_100: num(data.rate_per_100),
    currency_mode: data.currency_mode ?? "usd",
    amount_paid_usd: paid,
    status: statusOf(total, paid),
    notes: data.notes,
    items,
    subtotal_usd: subtotal,
    discount_usd: num(data.discount_usd),
    total_usd: total,
    sent_to_inventory: data.sent_to_inventory,
  }
}

export async function nextPurchaseNumber() {
  const { data } = await db().from("purchases").select("number").order("number", { ascending: false }).limit(1).maybeSingle()
  return Math.max(data?.number ?? 0, await highestNumberEver("purchases")) + 1
}
