"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { nextInvoiceNumber } from "@/lib/data/invoices"
import { round6 } from "@/lib/money"
import { CURRENCY_MODES } from "@/lib/data/types"
import { fail, type ActionResult } from "./result"

const InvoiceSchema = z.object({
  date: z.string().min(1),
  customer_id: z.guid().nullable(),
  rate_per_100: z.coerce.number().positive("Exchange rate is required"),
  currency_mode: z.enum(CURRENCY_MODES),
  amount_paid_usd: z.coerce.number().min(0, "Amount paid can't be negative"),
  notes: z.string().trim().nullable().optional(),
  items: z
    .array(z.object({ description: z.string().trim(), qty: z.coerce.number().min(0), unit_price_usd: z.coerce.number() }))
    // The line total is always qty x cost
    .transform((items) => items.filter((i) => i.description).map((i) => ({ ...i, total_usd: round6(i.qty * i.unit_price_usd) })))
    .refine((items) => items.length > 0, "Add at least one row with a description."),
})
export type InvoiceInput = z.input<typeof InvoiceSchema>

const refresh = () => {
  revalidatePath("/invoices", "layout")
  revalidatePath("/reports")
  revalidatePath("/debts")
}

async function saveInvoiceAction(id: string | null, input: InvoiceInput): Promise<ActionResult<{ id: string; number: number }>> {
  try {
    const { items, amount_paid_usd, ...rest } = InvoiceSchema.parse(input)
    // Paid can't be more than the invoice; paid in full makes it "paid"
    const total = round6(items.reduce((s, i) => s + i.total_usd, 0))
    const paid = Math.min(round6(amount_paid_usd), total)
    const values = { ...rest, amount_paid_usd: paid, status: paid >= total - 0.005 && total > 0 ? "paid" : "unpaid" }
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
    refresh()
    return { ok: true, ...row }
  } catch (e) {
    return fail(e instanceof z.ZodError ? e.issues[0].message : e)
  }
}

/** Mark paid = paid in full; mark unpaid = nothing paid. */
async function setInvoiceStatusAction(id: string, status: "paid" | "unpaid"): Promise<ActionResult> {
  try {
    const items = must(await db().from("invoice_items").select("total_usd").eq("invoice_id", id))
    const total = round6(items.reduce((s, i) => s + Number(i.total_usd), 0))
    must(await db().from("invoices").update({ status, amount_paid_usd: status === "paid" ? total : 0 }).eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  try {
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
