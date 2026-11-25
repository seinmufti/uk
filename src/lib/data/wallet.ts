import "server-only"
import { db, must } from "@/lib/db"
import { docNumber, num, round2, usdToIqd } from "@/lib/money"
import { receiptNumber } from "./receipts"

type Currency = "usd" | "iqd"

/**
 * One movement of money in or out of the business's cash, in the currency it moved in (never converted):
 * a USD movement changes only the USD balance, an IQD one only the IQD balance.
 */
export type WalletEntry = {
  date: string
  kind: "capital" | "receipt_in" | "receipt_out" | "invoice" | "purchase" | "expense" | "debt_in" | "debt_out"
  label: string
  currency: Currency
  /** In its own currency (USD, or whole IQD). Positive: money in. Negative: money out. */
  amount: number
  href: string | null
  /** Each currency's balance after this movement */
  balanceUsd: number
  balanceIqd: number
}

export type WalletTotals = { usd: number; iqd: number }

/**
 * The wallet: every movement of cash, oldest first, with a running balance per currency. Nothing is entered
 * here; it is read from what the rest of the app records:
 *  + capital put in (Holdings → Capital)
 *  + / − receipts (money received from customers, paid to suppliers)
 *  + what customers paid on invoices without a receipt (typed on the invoice)
 *  − what was paid when buying (purchase invoices, the part paid at once)
 *  − expenses (salaries included)
 *  + / − payments recorded on debts without a receipt
 */
export async function getWallet(): Promise<{ entries: WalletEntry[]; balance: WalletTotals; moneyIn: WalletTotals; moneyOut: WalletTotals }> {
  const [capital, receipts, invoices, purchases, expenses, debts, settings] = await Promise.all([
    db().from("inventory_items").select("id, name, value_usd, date, currency, rate_per_100").eq("kind", "capital"),
    db().from("receipts").select("id, kind, number, date, party, amount_usd, invoice_id, debt_id, currency, rate_per_100"),
    db().from("invoices").select("id, number, date, amount_paid_usd, currency_mode, rate_per_100, customers(name)"),
    db().from("purchases").select("id, number, date, amount_paid_usd, currency_mode, rate_per_100, suppliers(name)"),
    db().from("expenses").select("id, date, description, amount_usd, currency, rate_per_100"),
    db().from("debts").select("id, direction, party, date, paid_usd, purchase_id, notes, currency, rate_per_100"),
    db().from("settings").select("last_rate_per_100").eq("id", 1).maybeSingle(),
  ])
  const lastRate = num(settings.data?.last_rate_per_100)
  const rec = must(receipts)
  // What receipts already paid on each invoice and debt (not counted twice)
  const byReceipts = (field: "invoice_id" | "debt_id", id: string) => rec.filter((r) => r[field] === id).reduce((s, r) => s + num(r.amount_usd), 0)

  const out: Omit<WalletEntry, "balanceUsd" | "balanceIqd">[] = []
  // A USD value as it moved: USD as is, IQD in whole dinars at the record's own rate
  const add = (e: Omit<WalletEntry, "balanceUsd" | "balanceIqd" | "amount" | "currency">, usdValue: number, currency: string | null, rate: unknown) => {
    const cur: Currency = currency === "iqd" ? "iqd" : "usd"
    const amount = cur === "iqd" ? Math.round(usdToIqd(usdValue, num(rate) || lastRate)) : round2(usdValue)
    if (amount !== 0) out.push({ ...e, currency: cur, amount })
  }

  for (const c of must(capital)) add({ date: c.date, kind: "capital", label: c.name, href: "/inventory?tab=capital" }, num(c.value_usd), c.currency, c.rate_per_100)
  for (const r of rec)
    add(
      { date: r.date, kind: r.kind === "in" ? "receipt_in" : "receipt_out", label: `${receiptNumber(r.kind, r.number)} · ${r.party}`, href: `/receipts/${r.id}` },
      (r.kind === "in" ? 1 : -1) * num(r.amount_usd),
      r.currency,
      r.rate_per_100,
    )
  for (const i of must(invoices) as unknown as { id: string; number: number; date: string; amount_paid_usd: string; currency_mode: string; rate_per_100: string | null; customers: { name: string } | null }[]) {
    const direct = num(i.amount_paid_usd) - byReceipts("invoice_id", i.id)
    // An IQD-only invoice is paid in IQD; the others in USD
    if (direct > 0.005) add({ date: i.date, kind: "invoice", label: `#${docNumber(i.number)}${i.customers ? ` · ${i.customers.name}` : ""}`, href: `/invoices/${i.id}` }, direct, i.currency_mode === "iqd" ? "iqd" : "usd", i.rate_per_100)
  }
  for (const p of must(purchases) as unknown as { id: string; number: number; date: string; amount_paid_usd: string; currency_mode: string; rate_per_100: string | null; suppliers: { name: string } | null }[]) {
    const paid = num(p.amount_paid_usd)
    if (paid > 0.005) add({ date: p.date, kind: "purchase", label: `#${docNumber(p.number)}${p.suppliers ? ` · ${p.suppliers.name}` : ""}`, href: `/purchases/${p.id}` }, -paid, p.currency_mode === "iqd" ? "iqd" : "usd", p.rate_per_100)
  }
  for (const e of must(expenses)) add({ date: e.date, kind: "expense", label: e.description, href: "/expenses" }, -num(e.amount_usd), e.currency, e.rate_per_100)
  for (const d of must(debts)) {
    const direct = num(d.paid_usd) - byReceipts("debt_id", d.id)
    if (direct > 0.005)
      add(
        { date: d.date, kind: d.direction === "receivable" ? "debt_in" : "debt_out", label: d.notes || d.party, href: d.purchase_id ? `/purchases/${d.purchase_id}` : `/debts?tab=${d.direction}` },
        (d.direction === "receivable" ? 1 : -1) * direct,
        d.currency,
        d.rate_per_100,
      )
  }

  // Oldest first for the running balances (money in before money out on the same day)
  out.sort((a, b) => a.date.localeCompare(b.date) || Math.sign(b.amount) - Math.sign(a.amount))
  let usd = 0
  let iqd = 0
  const entries = out.map((e) => {
    if (e.currency === "usd") usd = round2(usd + e.amount)
    else iqd += e.amount
    return { ...e, balanceUsd: usd, balanceIqd: iqd }
  })
  const sum = (cur: Currency, sign: 1 | -1) => out.filter((e) => e.currency === cur && Math.sign(e.amount) === sign).reduce((s, e) => s + sign * e.amount, 0)
  return {
    entries,
    balance: { usd, iqd },
    moneyIn: { usd: round2(sum("usd", 1)), iqd: sum("iqd", 1) },
    moneyOut: { usd: round2(sum("usd", -1)), iqd: sum("iqd", -1) },
  }
}
