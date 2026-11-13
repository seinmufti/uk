"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { getPurchase, nextPurchaseNumber } from "@/lib/data/purchases"
import { round2 } from "@/lib/money"
import { fail, type ActionResult } from "./result"

const PurchaseSchema = z.object({
  date: z.string().min(1),
  supplier_id: z.guid().nullable(),
  payment_status: z.enum(["paid", "debt"]),
  amount_paid_usd: z.coerce.number().min(0),
  notes: z.string().trim().nullable().optional(),
  items: z
    .array(z.object({ description: z.string().trim(), qty: z.coerce.number().min(0), unit_cost_usd: z.coerce.number().min(0) }))
    .transform((items) => items.filter((i) => i.description))
    .refine((items) => items.length > 0, "Add at least one row with a description."),
})
export type PurchaseInput = z.input<typeof PurchaseSchema>

const refresh = () => {
  revalidatePath("/purchases", "layout")
  revalidatePath("/debts")
  revalidatePath("/inventory")
  revalidatePath("/reports")
}

/**
 * A purchase on credit keeps one payable debt in step with it (total − paid now). Payments already
 * recorded on that debt are kept.
 */
async function syncPayable(purchaseId: string) {
  const p = await getPurchase(purchaseId)
  if (!p) return
  const { data: existing } = await db().from("debts").select("id").eq("purchase_id", purchaseId).maybeSingle()
  const owed = round2(p.total_usd - p.amount_paid_usd)
  if (p.payment_status !== "debt" || owed <= 0) {
    if (existing) must(await db().from("debts").delete().eq("id", existing.id))
    return
  }
  const values = {
    direction: "payable",
    party: p.supplier?.name ?? "—",
    supplier_id: p.supplier_id,
    purchase_id: p.id,
    amount_usd: owed,
    date: p.date,
    notes: `Purchase #${String(p.number).padStart(4, "0")}`,
  }
  if (existing) must(await db().from("debts").update(values).eq("id", existing.id))
  else must(await db().from("debts").insert(values))
}

async function savePurchaseAction(id: string | null, input: PurchaseInput): Promise<ActionResult<{ id: string; number: number }>> {
  try {
    const { items, ...values } = PurchaseSchema.parse(input)
    const total = round2(items.reduce((s, i) => s + i.qty * i.unit_cost_usd, 0))
    // Paid in full: the amount paid is the total
    const row_values = { ...values, amount_paid_usd: values.payment_status === "paid" ? total : Math.min(values.amount_paid_usd, total) }
    let row: { id: string; number: number }
    if (id) {
      row = must(await db().from("purchases").update(row_values).eq("id", id).select("id, number").single())
      must(await db().from("purchase_items").delete().eq("purchase_id", id))
    } else {
      for (let attempt = 0; ; attempt++) {
        const number = await nextPurchaseNumber()
        const res = await db().from("purchases").insert({ ...row_values, number }).select("id, number").single()
        if (!res.error) {
          row = res.data
          break
        }
        if (res.error.code !== "23505" || attempt > 3) throw new Error(res.error.message)
      }
    }
    must(await db().from("purchase_items").insert(items.map((item, sort) => ({ ...item, sort, purchase_id: row.id }))))
    await syncPayable(row.id)
    refresh()
    return { ok: true, ...row }
  } catch (e) {
    return fail(e instanceof z.ZodError ? e.issues[0].message : e)
  }
}

/** Adds the purchase's items to inventory stock (once). */
async function sendPurchaseToInventoryAction(id: string): Promise<ActionResult> {
  try {
    const p = await getPurchase(id)
    if (!p) throw new Error("Purchase not found")
    if (p.sent_to_inventory) throw new Error("Already sent to inventory")
    must(
      await db()
        .from("inventory_items")
        .insert(
          p.items.map((i) => ({
            kind: "stock",
            name: i.description,
            qty: i.qty,
            value_usd: round2(i.qty * i.unit_cost_usd),
            date: p.date,
            source_purchase_id: p.id,
          })),
        ),
    )
    must(await db().from("purchases").update({ sent_to_inventory: true }).eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

async function deletePurchaseAction(id: string): Promise<ActionResult> {
  try {
    must(await db().from("purchases").delete().eq("id", id))
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// Each action is one change in the history (undo / redo as a unit)
export const savePurchase = tracked(savePurchaseAction)
export const sendPurchaseToInventory = tracked(sendPurchaseToInventoryAction)
export const deletePurchase = tracked(deletePurchaseAction)
