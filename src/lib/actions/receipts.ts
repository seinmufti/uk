"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { nextReceiptNumber } from "@/lib/data/receipts"
import { RECEIPT_METHODS } from "@/lib/data/types"
import { num, round2 } from "@/lib/money"
import { fail, type ActionResult } from "./result"

const ReceiptSchema = z.object({
  kind: z.enum(["in", "out"]),
  date: z.string().min(1),
  party_id: z.guid("Choose who paid / who was paid"),
  amount_usd: z.coerce.number().positive("Amount is required"),
  rate_per_100: z.coerce.number().positive("Exchange rate is required"),
  method: z.enum(RECEIPT_METHODS),
  invoice_id: z.guid().nullable(),
  debt_id: z.guid().nullable(),
  notes: z.string().trim().nullable().optional(),
})
export type ReceiptInput = z.input<typeof ReceiptSchema>

const refresh = () => {
  revalidatePath("/receipts", "layout")
  revalidatePath("/invoices", "layout")
  revalidatePath("/debts")
  revalidatePath("/reports")
}

/** Records a receipt and settles what it was for: the invoice becomes paid, or the debt goes down. */
async function saveReceiptAction(input: ReceiptInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { party_id, ...v } = ReceiptSchema.parse(input)
    const party = must(await db().from(v.kind === "in" ? "customers" : "suppliers").select("id, name").eq("id", party_id).single())
    const amount = round2(v.amount_usd)

    if (v.invoice_id) {
      if (v.kind !== "in") throw new Error("Only money received can pay an invoice")
      const inv = must(await db().from("invoices").select("status, invoice_items(total_usd)").eq("id", v.invoice_id).single())
      if (inv.status === "paid") throw new Error("That invoice is already paid")
      const total = round2(inv.invoice_items.reduce((s: number, x: { total_usd: string }) => s + num(x.total_usd), 0))
      if (amount !== total) throw new Error(`An invoice is paid in full: ${total.toFixed(2)} USD`)
    }
    let debt: { amount_usd: string; paid_usd: string } | null = null
    if (v.debt_id) {
      debt = must(await db().from("debts").select("amount_usd, paid_usd").eq("id", v.debt_id).single())
      const left = round2(num(debt.amount_usd) - num(debt.paid_usd))
      if (amount > left) throw new Error(`Only ${left.toFixed(2)} USD is left on that debt`)
    }

    const values = {
      ...v,
      amount_usd: amount,
      party: party.name,
      customer_id: v.kind === "in" ? party.id : null,
      supplier_id: v.kind === "out" ? party.id : null,
      notes: v.notes || null,
    }
    let id = ""
    for (let attempt = 0; ; attempt++) {
      const number = await nextReceiptNumber(v.kind)
      const res = await db().from("receipts").insert({ ...values, number }).select("id").single()
      if (!res.error) {
        id = res.data.id
        break
      }
      if (res.error.code !== "23505" || attempt > 3) throw new Error(res.error.message)
    }

    if (v.invoice_id) must(await db().from("invoices").update({ status: "paid" }).eq("id", v.invoice_id))
    if (v.debt_id && debt) must(await db().from("debts").update({ paid_usd: round2(num(debt.paid_usd) + amount) }).eq("id", v.debt_id))
    refresh()
    return { ok: true, id }
  } catch (e) {
    return fail(e instanceof z.ZodError ? e.issues[0].message : e)
  }
}

/** Deletes a receipt and undoes what it settled. */
async function deleteReceiptAction(id: string): Promise<ActionResult> {
  try {
    const r = must(await db().from("receipts").select("amount_usd, invoice_id, debt_id").eq("id", id).single())
    if (r.invoice_id) must(await db().from("invoices").update({ status: "unpaid" }).eq("id", r.invoice_id))
    if (r.debt_id) {
      const d = await db().from("debts").select("paid_usd").eq("id", r.debt_id).maybeSingle()
      if (d.data) must(await db().from("debts").update({ paid_usd: Math.max(0, round2(num(d.data.paid_usd) - num(r.amount_usd))) }).eq("id", r.debt_id))
    }
    must(await db().from("receipts").delete().eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// Each action is one change in the history (undo / redo as a unit)
export const saveReceipt = tracked(saveReceiptAction)
export const deleteReceipt = tracked(deleteReceiptAction)
