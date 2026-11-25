"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { DocSchema, settle, type DocInput } from "@/lib/doc-schema"
import { db, must } from "@/lib/db"
import { nextInvoiceNumber } from "@/lib/data/invoices"
import { receiptForInvoicePayment, receiptsTotal } from "@/lib/invoice-receipts"
import { round6 } from "@/lib/money"
import { fail, type ActionResult } from "./result"

export type InvoiceInput = DocInput

const refresh = () => {
  revalidatePath("/invoices", "layout")
  revalidatePath("/receipts", "layout")
  revalidatePath("/wallet")
  revalidatePath("/reports")
  revalidatePath("/debts")
}

async function saveInvoiceAction(id: string | null, input: InvoiceInput): Promise<ActionResult<{ id: string; number: number }>> {
  try {
    const parsed = DocSchema.parse(input)
    const { items, ...rest } = parsed
    // The discount comes off the lines; payment, status and due date go by what is left
    const m = settle(parsed)
    const values = { ...rest, discount_usd: m.discount, amount_paid_usd: m.paid, due_date: m.due_date, status: m.fullyPaid ? "paid" : "unpaid" }
    // What its receipts already paid can't be taken back here (delete a receipt to lower it)
    if (id) {
      const byReceipts = await receiptsTotal(id)
      if (m.paid < byReceipts - 0.005) throw new Error(`Receipts already paid ${byReceipts.toFixed(2)} USD on this invoice. Delete a receipt to lower the paid amount.`)
    }
    let row: { id: string; number: number }
    if (id) {
      row = must(await db().from("invoices").update(values).eq("id", id).select("id, number").single())
      must(await db().from("invoice_items").delete().eq("invoice_id", id))
    } else {
      // Two people saving at the same moment could pick the same number: the unique index refuses
      // the second one, so try the next number.
      for (let attempt = 0; ; attempt++) {
        const number = await nextInvoiceNumber()
        const res = await db().from("invoices").insert({ ...values, number }).select("id, number").single()
        if (!res.error) {
          row = res.data
          break
        }
        if (res.error.code !== "23505" || attempt > 3) throw new Error(res.error.message)
      }
    }
    must(await db().from("invoice_items").insert(items.map((item, sort) => ({ ...item, sort, invoice_id: row.id }))))
    // A payment typed on the invoice becomes a receipt
    await receiptForInvoicePayment(row.id)
    refresh()
    return { ok: true, ...row }
  } catch (e) {
    return fail(e instanceof z.ZodError ? e.issues[0].message : e)
  }
}

/** Mark paid = paid in full; mark unpaid = back to only what its receipts paid. */
async function setInvoiceStatusAction(id: string, status: "paid" | "unpaid"): Promise<ActionResult> {
  try {
    const items = must(await db().from("invoice_items").select("total_usd").eq("invoice_id", id))
    const inv = must(await db().from("invoices").select("discount_usd").eq("id", id).single())
    const total = round6(Math.max(0, items.reduce((s, i) => s + Number(i.total_usd), 0) - Number(inv.discount_usd)))
    // Receipts recorded against the invoice still count as paid after it is marked unpaid
    const receipts = must(await db().from("receipts").select("amount_usd").eq("invoice_id", id))
    const fromReceipts = Math.min(total, round6(receipts.reduce((s, r) => s + Number(r.amount_usd), 0)))
    must(await db().from("invoices").update({ status, amount_paid_usd: status === "paid" ? total : fromReceipts, ...(status === "paid" ? { due_date: null } : {}) }).eq("id", id))
    // Paying the rest makes a receipt for it
    if (status === "paid") await receiptForInvoicePayment(id)
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  try {
    // Its receipts would be left paying nothing
    const paid = must(await db().from("receipts").select("id").eq("invoice_id", id).limit(1))
    if (paid.length) throw new Error("Receipts were recorded for this invoice. Delete those receipts first.")
    must(await db().from("invoices").delete().eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// Each action is one change in the history (undo / redo as a unit)
export const saveInvoice = tracked(saveInvoiceAction)
export const setInvoiceStatus = tracked(setInvoiceStatusAction)
export const deleteInvoice = tracked(deleteInvoiceAction)
