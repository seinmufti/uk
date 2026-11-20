"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { DocSchema, settle, type DocInput } from "@/lib/doc-schema"
import { db, must } from "@/lib/db"
import { getPurchase, nextPurchaseNumber } from "@/lib/data/purchases"
import { num, round2, round6 } from "@/lib/money"
import { fail, type ActionResult } from "./result"

export type PurchaseInput = DocInput

const refresh = () => {
  revalidatePath("/purchases", "layout")
  revalidatePath("/debts")
  revalidatePath("/inventory")
  revalidatePath("/reports")
}

/**
 * A purchase not paid in full keeps one payable debt in step with it (total − paid when bought). Payments
 * made later go on that debt and are kept, so a debt that has been paid on is never removed.
 */
async function syncPayable(purchaseId: string) {
  const p = await getPurchase(purchaseId)
  if (!p) return
  const { data: existing } = await db().from("debts").select("id, paid_usd").eq("purchase_id", purchaseId).maybeSingle()
  // p.amount_paid_usd includes the debt's payments; the debt itself is what was left when bought
  const owed = round2(p.total_usd - (p.amount_paid_usd - num(existing?.paid_usd)))
  if (owed <= 0) {
    if (existing) must(await db().from("debts").delete().eq("id", existing.id))
    return
  }
  const values = {
    direction: "payable",
    party: p.customer?.name ?? "—",
    supplier_id: p.customer_id,
    purchase_id: p.id,
    amount_usd: owed,
    date: p.date,
    due_date: p.due_date,
    notes: `Purchase #${String(p.number).padStart(4, "0")}`,
  }
  if (existing) must(await db().from("debts").update(values).eq("id", existing.id))
  else must(await db().from("debts").insert(values))
}

async function savePurchaseAction(id: string | null, input: PurchaseInput): Promise<ActionResult<{ id: string; number: number }>> {
  try {
    const parsed = DocSchema.parse(input)
    const { items: lines, customer_id, ...rest } = parsed
    const m = settle(parsed)
    // The form's "paid" counts payments already made on the purchase's debt; only the rest was paid when bought
    const debtPaid = id ? num(must(await db().from("debts").select("paid_usd").eq("purchase_id", id).maybeSingle())?.paid_usd) : 0
    const upfront = round6(Math.max(0, m.paid - debtPaid))
    // Stored as the purchase's own columns: supplier, unit cost; "debt" while something is still owed
    const row_values = { ...rest, supplier_id: customer_id, discount_usd: m.discount, amount_paid_usd: upfront, due_date: m.due_date, payment_status: m.fullyPaid ? "paid" : "debt" }
    const items = lines.map((i) => ({ description: i.description, qty: i.qty, unit_cost_usd: i.unit_price_usd }))
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
            value_usd: round2(i.total_usd),
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
    // Payments made on its debt would be left paying nothing
    const debt = must(await db().from("debts").select("id").eq("purchase_id", id))
    const paid = debt.length ? must(await db().from("receipts").select("id").in("debt_id", debt.map((d) => d.id)).limit(1)) : []
    if (paid.length) throw new Error("Payments were recorded for this purchase. Delete those receipts first.")
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
