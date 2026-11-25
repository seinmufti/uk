import "server-only"
import { today } from "@/lib/dates"
import { db, must } from "@/lib/db"
import { nextReceiptNumber } from "@/lib/data/receipts"
import { num, round6 } from "@/lib/money"

/** What the receipts recorded against an invoice add up to. */
export async function receiptsTotal(invoiceId: string) {
  const rows = must(await db().from("receipts").select("amount_usd").eq("invoice_id", invoiceId))
  return round6(rows.reduce((s, r) => s + num(r.amount_usd), 0))
}

/**
 * Every payment on a customer invoice is a receipt: when the invoice's paid amount is more than its receipts
 * cover (paid in full or in part on the invoice), a receipt for the rest is made, for that invoice and its
 * customer, in the invoice's currency.
 */
export async function receiptForInvoicePayment(invoiceId: string) {
  const inv = must(
    await db().from("invoices").select("id, number, customer_id, amount_paid_usd, currency_mode, rate_per_100, customers(name)").eq("id", invoiceId).single(),
  ) as unknown as { id: string; number: number; customer_id: string | null; amount_paid_usd: string; currency_mode: string; rate_per_100: string | null; customers: { name: string } | null }
  const gap = round6(num(inv.amount_paid_usd) - (await receiptsTotal(invoiceId)))
  if (gap <= 0.005) return
  let rate = num(inv.rate_per_100)
  if (!rate) rate = num(must(await db().from("settings").select("last_rate_per_100").eq("id", 1).single()).last_rate_per_100)
  const values = {
    kind: "in",
    date: today(),
    party: inv.customers?.name ?? "—",
    customer_id: inv.customer_id,
    amount_usd: gap,
    // An IQD-only invoice is paid in IQD; the others in USD
    currency: inv.currency_mode === "iqd" ? "iqd" : "usd",
    rate_per_100: rate,
    method: "cash",
    invoice_id: inv.id,
  }
  // Two receipts saved at the same moment could pick the same number: try the next one
  for (let attempt = 0; ; attempt++) {
    const res = await db().from("receipts").insert({ ...values, number: await nextReceiptNumber("in") })
    if (!res.error) return
    if (res.error.code !== "23505" || attempt > 3) throw new Error(res.error.message)
  }
}
