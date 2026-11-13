import "server-only"
import { db, must } from "@/lib/db"
import { num, round6 } from "@/lib/money"
import type { Invoice, InvoiceItem, InvoiceRow } from "./types"

// Kept to 6 decimals so IQD invoices convert back to exact IQD
const sumItems = (items: { total_usd: unknown }[]) => round6(items.reduce((s, i) => s + num(i.total_usd), 0))

export async function listInvoices(): Promise<InvoiceRow[]> {
  const rows = must(
    await db().from("invoices").select("id, number, date, status, customer_id, currency_mode, rate_per_100, customers(name), invoice_items(total_usd)").order("number", { ascending: false }),
  ) as unknown as { id: string; number: number; date: string; status: "paid" | "unpaid"; customer_id: string | null; currency_mode: Invoice["currency_mode"]; rate_per_100: string; customers: { name: string } | null; invoice_items: { total_usd: string }[] }[]
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    date: r.date,
    status: r.status,
    customer_id: r.customer_id,
    customer_name: r.customers?.name ?? null,
    currency_mode: r.currency_mode,
    rate_per_100: num(r.rate_per_100),
    total_usd: sumItems(r.invoice_items),
  }))
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data } = await db()
    .from("invoices")
    .select("*, customer:customers(*), invoice_items(id, description, qty, unit_price_usd, total_usd, sort)")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  const items: InvoiceItem[] = [...data.invoice_items]
    .sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
    .map((i: Record<string, unknown>) => ({ id: i.id as string, description: i.description as string, qty: num(i.qty), unit_price_usd: i.unit_price_usd == null ? round6(num(i.total_usd) / (num(i.qty) || 1)) : num(i.unit_price_usd), total_usd: num(i.total_usd) }))
  return {
    id: data.id,
    number: data.number,
    date: data.date,
    customer_id: data.customer_id,
    customer: data.customer,
    rate_per_100: num(data.rate_per_100),
    currency_mode: data.currency_mode ?? "usd_iqd",
    status: data.status,
    notes: data.notes,
    items,
    total_usd: sumItems(items),
  }
}

export async function nextInvoiceNumber() {
  const { data } = await db().from("invoices").select("number").order("number", { ascending: false }).limit(1).maybeSingle()
  return (data?.number ?? 0) + 1
}
