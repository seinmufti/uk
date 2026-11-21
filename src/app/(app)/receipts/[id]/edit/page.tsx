import { notFound } from "next/navigation"
import { ReceiptForm } from "@/components/receipt-form"
import { db, must } from "@/lib/db"
import { listParties } from "@/lib/data/parties"
import { getReceipt, listOpenItems, receiptNumber } from "@/lib/data/receipts"
import type { OpenItem } from "@/lib/data/types"
import { docNumber, num, round2 } from "@/lib/money"
import { getRate } from "@/lib/rate"

/** Changing a receipt: the same form, with what it paid still on the list (with this receipt's amount back on it). */
export default async function EditReceiptPage({ params }: PageProps<"/receipts/[id]/edit">) {
  const { id } = await params
  const [receipt, customers, suppliers, open, rate] = await Promise.all([
    getReceipt(id),
    listParties("customers", { all: true }),
    listParties("suppliers", { all: true }),
    listOpenItems(),
    getRate(),
  ])
  if (!receipt) notFound()

  // What this receipt pays shows with this receipt's amount added back, even if it paid it off
  const list = open[receipt.kind]
  const key = receipt.invoice_id ? { type: "invoice", id: receipt.invoice_id } : receipt.debt_id ? { type: "debt", id: receipt.debt_id } : null
  if (key) {
    const found = list.find((i) => i.type === key.type && i.id === key.id)
    if (found) found.remaining = round2(found.remaining + receipt.amount_usd)
    else if (key.type === "invoice") {
      const inv = must(await db().from("invoices").select("id, number, customer_id, amount_paid_usd, discount_usd, customers(name), invoice_items(total_usd)").eq("id", key.id).single()) as unknown as {
        id: string
        number: number
        customer_id: string | null
        amount_paid_usd: string
        discount_usd: string
        customers: { name: string } | null
        invoice_items: { total_usd: string }[]
      }
      const total = Math.max(0, inv.invoice_items.reduce((s, x) => s + num(x.total_usd), 0) - num(inv.discount_usd))
      list.unshift({ type: "invoice", id: inv.id, label: `Invoice ${docNumber(inv.number)}`, remaining: round2(total - num(inv.amount_paid_usd) + receipt.amount_usd), customer_id: inv.customer_id, supplier_id: null, party: inv.customers?.name ?? "" } satisfies OpenItem)
    } else {
      const d = must(await db().from("debts").select("id, party, customer_id, supplier_id, amount_usd, paid_usd, notes").eq("id", key.id).single())
      list.unshift({ type: "debt", id: d.id, label: d.notes || `Debt: ${d.party}`, remaining: round2(num(d.amount_usd) - num(d.paid_usd) + receipt.amount_usd), customer_id: d.customer_id, supplier_id: d.supplier_id, party: d.party } satisfies OpenItem)
    }
  }

  const number = receiptNumber(receipt.kind, receipt.number)
  return (
    <ReceiptForm
      kind={receipt.kind}
      customers={customers}
      suppliers={suppliers}
      open={open}
      numbers={{ in: receipt.kind === "in" ? number : "R-…", out: receipt.kind === "out" ? number : "P-…" }}
      liveRate={rate?.rate ?? null}
      receipt={receipt}
    />
  )
}
