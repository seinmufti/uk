import "server-only"
import { db, must } from "@/lib/db"
import { docNumber, num, round2 } from "@/lib/money"
import type { OpenItem, Receipt, ReceiptKind } from "./types"

/** R-0001 for money received, P-0001 for money paid. */
export const receiptNumber = (kind: ReceiptKind, n: number) => `${kind === "in" ? "R" : "P"}-${docNumber(n)}`

const SELECT = "*, invoices(number), debts(party, notes)"
type Row = Omit<Receipt, "for_label" | "amount_usd" | "rate_per_100"> & {
  amount_usd: string
  rate_per_100: string
  invoices: { number: number } | null
  debts: { party: string; notes: string | null } | null
}
const toReceipt = ({ invoices, debts, ...r }: Row): Receipt => ({
  ...r,
  amount_usd: num(r.amount_usd),
  rate_per_100: num(r.rate_per_100),
  for_label: invoices ? `Invoice ${docNumber(invoices.number)}` : debts ? debts.notes || `Debt: ${debts.party}` : null,
})

export async function listReceipts(): Promise<Receipt[]> {
  const rows = must(await db().from("receipts").select(SELECT).order("date", { ascending: false }).order("created_at", { ascending: false }))
  return (rows as unknown as Row[]).map(toReceipt)
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const row = must(await db().from("receipts").select(SELECT).eq("id", id).maybeSingle())
  return row ? toReceipt(row as unknown as Row) : null
}

export async function nextReceiptNumber(kind: ReceiptKind): Promise<number> {
  const row = must(await db().from("receipts").select("number").eq("kind", kind).order("number", { ascending: false }).limit(1).maybeSingle())
  return (row?.number ?? 0) + 1
}

/** Everything still owed: unpaid invoices and receivable debts (money in), payable debts (money out). */
export async function listOpenItems(): Promise<Record<ReceiptKind, OpenItem[]>> {
  const [invoices, debts] = await Promise.all([
    db().from("invoices").select("id, number, customer_id, amount_paid_usd, customers(name), invoice_items(total_usd)").eq("status", "unpaid").order("number"),
    db().from("debts").select("id, direction, party, customer_id, supplier_id, amount_usd, paid_usd, notes").order("date"),
  ])
  type Inv = { id: string; number: number; customer_id: string | null; amount_paid_usd: string; customers: { name: string } | null; invoice_items: { total_usd: string }[] }
  const inv: OpenItem[] = (must(invoices) as unknown as Inv[]).map((i) => ({
    type: "invoice",
    id: i.id,
    label: `Invoice ${docNumber(i.number)}`,
    remaining: round2(i.invoice_items.reduce((s, x) => s + num(x.total_usd), 0) - num(i.amount_paid_usd)),
    customer_id: i.customer_id,
    supplier_id: null,
    party: i.customers?.name ?? "",
  }))
  const open = must(debts)
    .map((d) => ({ ...d, remaining: round2(num(d.amount_usd) - num(d.paid_usd)) }))
    .filter((d) => d.remaining > 0)
  const debtItem = (d: (typeof open)[number]): OpenItem => ({
    type: "debt",
    id: d.id,
    label: d.notes || `Debt: ${d.party}`,
    remaining: d.remaining,
    customer_id: d.customer_id,
    supplier_id: d.supplier_id,
    party: d.party,
  })
  return {
    in: [...inv, ...open.filter((d) => d.direction === "receivable").map(debtItem)],
    out: open.filter((d) => d.direction === "payable").map(debtItem),
  }
}
