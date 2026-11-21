"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { nextReceiptNumber } from "@/lib/data/receipts"
import { RECEIPT_METHODS } from "@/lib/data/types"
import { num, round2, round6 } from "@/lib/money"
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

/**
 * Records a receipt (or changes one: pass its id) and settles what it was for: the invoice's paid amount
 * goes up (paid once nothing is left), or the debt goes down. Changing a receipt first takes its old
 * amount back off whatever it paid before.
 */
async function saveReceiptAction(id: string | null, input: ReceiptInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { party_id, ...v } = ReceiptSchema.parse(input)
    const party = must(await db().from(v.kind === "in" ? "customers" : "suppliers").select("id, name").eq("id", party_id).single())
    const amount = round2(v.amount_usd)
    const old = id ? must(await db().from("receipts").select("kind, number, amount_usd, invoice_id, debt_id").eq("id", id).single()) : null
    // What this receipt already paid on a target, which a change doesn't count twice
    const already = (target: "invoice_id" | "debt_id", targetId: string | null) => (old && targetId && old[target] === targetId ? num(old.amount_usd) : 0)

    let invoiceTotal = 0
    let invoicePaid = 0
    if (v.invoice_id) {
      if (v.kind !== "in") throw new Error("Only money received can pay an invoice")
      const inv = must(await db().from("invoices").select("status, amount_paid_usd, discount_usd, invoice_items(total_usd)").eq("id", v.invoice_id).single())
      const paidBefore = Math.max(0, num(inv.amount_paid_usd) - already("invoice_id", v.invoice_id))
      invoiceTotal = Math.max(0, inv.invoice_items.reduce((s: number, x: { total_usd: string }) => s + num(x.total_usd), 0) - num(inv.discount_usd))
      // A receipt can pay all or part of what is left; the invoice becomes paid once nothing is left
      const left = round2(invoiceTotal - paidBefore)
      if (left <= 0.005) throw new Error("That invoice is already paid")
      if (amount > left + 0.005) throw new Error(`Only ${left.toFixed(2)} USD is left on that invoice`)
      const sum = round6(paidBefore + amount)
      invoicePaid = sum >= invoiceTotal - 0.005 ? invoiceTotal : sum
    }
    let debtPaid = 0
    if (v.debt_id) {
      const debt = must(await db().from("debts").select("amount_usd, paid_usd").eq("id", v.debt_id).single())
      const paidBefore = Math.max(0, round2(num(debt.paid_usd) - already("debt_id", v.debt_id)))
      const left = round2(num(debt.amount_usd) - paidBefore)
      if (amount > left + 0.005) throw new Error(`Only ${left.toFixed(2)} USD is left on that debt`)
      debtPaid = round2(paidBefore + amount)
    }

    const values = {
      ...v,
      amount_usd: amount,
      party: party.name,
      customer_id: v.kind === "in" ? party.id : null,
      supplier_id: v.kind === "out" ? party.id : null,
      notes: v.notes || null,
    }

    // A changed receipt: take its old amount off what it paid before (when that is no longer what it pays)
    if (old?.invoice_id && old.invoice_id !== v.invoice_id) {
      const inv = await db().from("invoices").select("amount_paid_usd").eq("id", old.invoice_id).maybeSingle()
      if (inv.data) must(await db().from("invoices").update({ status: "unpaid", amount_paid_usd: Math.max(0, num(inv.data.amount_paid_usd) - num(old.amount_usd)) }).eq("id", old.invoice_id))
    }
    if (old?.debt_id && old.debt_id !== v.debt_id) {
      const d = await db().from("debts").select("paid_usd").eq("id", old.debt_id).maybeSingle()
      if (d.data) must(await db().from("debts").update({ paid_usd: Math.max(0, round2(num(d.data.paid_usd) - num(old.amount_usd))) }).eq("id", old.debt_id))
    }

    let savedId = id ?? ""
    if (old && id) {
      // Same kind keeps its number (R-0003 stays R-0003); switching money in ↔ out takes the next number of the other kind
      const number = old.kind === v.kind ? old.number : await nextReceiptNumber(v.kind)
      must(await db().from("receipts").update({ ...values, number }).eq("id", id))
    } else {
      for (let attempt = 0; ; attempt++) {
        const number = await nextReceiptNumber(v.kind)
        const res = await db().from("receipts").insert({ ...values, number }).select("id").single()
        if (!res.error) {
          savedId = res.data.id
          break
        }
        if (res.error.code !== "23505" || attempt > 3) throw new Error(res.error.message)
      }
    }

    if (v.invoice_id) must(await db().from("invoices").update({ status: invoicePaid >= invoiceTotal - 0.005 ? "paid" : "unpaid", amount_paid_usd: invoicePaid }).eq("id", v.invoice_id))
    if (v.debt_id) must(await db().from("debts").update({ paid_usd: debtPaid }).eq("id", v.debt_id))
    refresh()
    return { ok: true, id: savedId }
  } catch (e) {
    return fail(e instanceof z.ZodError ? e.issues[0].message : e)
  }
}

/** Deletes a receipt and undoes what it settled. */
async function deleteReceiptAction(id: string): Promise<ActionResult> {
  try {
    const r = must(await db().from("receipts").select("amount_usd, invoice_id, debt_id").eq("id", id).single())
    if (r.invoice_id) {
      const inv = await db().from("invoices").select("amount_paid_usd").eq("id", r.invoice_id).maybeSingle()
      if (inv.data) must(await db().from("invoices").update({ status: "unpaid", amount_paid_usd: Math.max(0, num(inv.data.amount_paid_usd) - num(r.amount_usd)) }).eq("id", r.invoice_id))
    }
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
