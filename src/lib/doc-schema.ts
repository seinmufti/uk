import { z } from "zod"
import { CURRENCY_MODES } from "@/lib/data/types"
import { round6 } from "@/lib/money"

/** What the invoice form sends, for sales and purchase invoices alike (amounts in USD). */
export const DocSchema = z.object({
  date: z.string().min(1),
  customer_id: z.guid().nullable(), // the supplier on a purchase
  rate_per_100: z.coerce.number().positive("Exchange rate is required"),
  currency_mode: z.enum(CURRENCY_MODES),
  amount_paid_usd: z.coerce.number().min(0, "Amount paid can't be negative"),
  discount_usd: z.coerce.number().min(0, "Discount can't be negative").default(0),
  due_date: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  items: z
    .array(z.object({ description: z.string().trim(), qty: z.coerce.number().min(0), unit_price_usd: z.coerce.number() }))
    // The line total is always qty x cost
    .transform((items) => items.filter((i) => i.description).map((i) => ({ ...i, total_usd: round6(i.qty * i.unit_price_usd) })))
    .refine((items) => items.length > 0, "Add at least one row with a description."),
})
export type DocInput = z.input<typeof DocSchema>

/** The money of a saved document: discount capped at the lines, paid capped at the total; due date only while something is owed. */
export function settle(v: z.output<typeof DocSchema>) {
  const subtotal = round6(v.items.reduce((s, i) => s + i.total_usd, 0))
  const discount = Math.min(round6(v.discount_usd), subtotal)
  const total = round6(subtotal - discount)
  const paid = Math.min(round6(v.amount_paid_usd), total)
  const fullyPaid = paid >= total - 0.005 && total > 0
  return { total, discount, paid, fullyPaid, due_date: fullyPaid ? null : v.due_date || null }
}
