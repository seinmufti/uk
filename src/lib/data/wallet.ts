import "server-only"
import { db, must } from "@/lib/db"
import { docNumber, num, round2 } from "@/lib/money"
import { receiptNumber } from "./receipts"

/** One movement of money in or out of the business's cash, with the balance after it. */
export type WalletEntry = {
  date: string
  kind: "capital" | "receipt_in" | "receipt_out" | "invoice" | "purchase" | "expense" | "debt_in" | "debt_out"
  label: string
  /** Positive: money in. Negative: money out. */
  amount: number
  href: string | null
  balance: number
}

/**
 * The wallet: every movement of cash, oldest first, with a running balance. Nothing is entered here;
 * it is read from what the rest of the app records:
 *  + capital put in (Holdings → Capital)
 *  + / − receipts (money received from customers, paid to suppliers)
 *  + what customers paid on invoices without a receipt (typed on the invoice)
 *  − what was paid when buying (purchase invoices, the part paid at once)
 *  − expenses (salaries included)
 *  + / − payments recorded on debts without a receipt
 */
export async function getWallet(): Promise<{ entries: WalletEntry[]; balance: number; moneyIn: number; moneyOut: number }> {
  const [capital, receipts, invoices, purchases, expenses, debts] = await Promise.all([
    db().from("inventory_items").select("id, name, value_usd, date").eq("kind", "capital"),
    db().from("receipts").select("id, kind, number, date, party, amount_usd, invoice_id, debt_id"),
    db().from("invoices").select("id, number, date, amount_paid_usd, customers(name)"),
    db().from("purchases").select("id, number, date, amount_paid_usd, suppliers(name)"),
    db().from("expenses").select("id, date, description, amount_usd"),
    db().from("debts").select("id, direction, party, date, paid_usd, purchase_id, notes"),
  ])
  const rec = must(receipts)
  // What receipts already paid on each invoice and debt (not counted twice)
  const byReceipts = (field: "invoice_id" | "debt_id", id: string) => rec.filter((r) => r[field] === id).reduce((s, r) => s + num(r.amount_usd), 0)

  const out: Omit<WalletEntry, "balance">[] = []
  for (const c of must(capital)) out.push({ date: c.date, kind: "capital", label: c.name, amount: num(c.value_usd), href: "/inventory?tab=capital" })
  for (const r of rec)
    out.push({
      date: r.date,
      kind: r.kind === "in" ? "receipt_in" : "receipt_out",
      label: `${receiptNumber(r.kind, r.number)} · ${r.party}`,
      amount: (r.kind === "in" ? 1 : -1) * num(r.amount_usd),
      href: `/receipts/${r.id}`,
    })
  for (const i of must(invoices) as unknown as { id: string; number: number; date: string; amount_paid_usd: string; customers: { name: string } | null }[]) {
    const direct = round2(num(i.amount_paid_usd) - byReceipts("invoice_id", i.id))
    if (direct > 0.005) out.push({ date: i.date, kind: "invoice", label: `#${docNumber(i.number)}${i.customers ? ` · ${i.customers.name}` : ""}`, amount: direct, href: `/invoices/${i.id}` })
  }
  for (const p of must(purchases) as unknown as { id: string; number: number; date: string; amount_paid_usd: string; suppliers: { name: string } | null }[]) {
    const paid = num(p.amount_paid_usd)
    if (paid > 0.005) out.push({ date: p.date, kind: "purchase", label: `#${docNumber(p.number)}${p.suppliers ? ` · ${p.suppliers.name}` : ""}`, amount: -paid, href: `/purchases/${p.id}` })
  }
  for (const e of must(expenses)) out.push({ date: e.date, kind: "expense", label: e.description, amount: -num(e.amount_usd), href: "/expenses" })
  for (const d of must(debts)) {
    const direct = round2(num(d.paid_usd) - byReceipts("debt_id", d.id))
    if (direct > 0.005)
      out.push({
        date: d.date,
        kind: d.direction === "receivable" ? "debt_in" : "debt_out",
        label: d.notes || d.party,
        amount: (d.direction === "receivable" ? 1 : -1) * direct,
        href: d.purchase_id ? `/purchases/${d.purchase_id}` : `/debts?tab=${d.direction}`,
      })
  }

  // Oldest first for the running balance (money in before money out on the same day)
  out.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount)
  let balance = 0
  const entries = out.map((e) => ((balance = round2(balance + e.amount)), { ...e, balance }))
  const moneyIn = round2(out.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0))
  const moneyOut = round2(out.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0))
  return { entries, balance, moneyIn, moneyOut }
}
