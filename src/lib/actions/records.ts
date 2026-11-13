"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { EXPENSE_CATEGORIES, INVENTORY_KINDS } from "@/lib/data/types"
import { round2 } from "@/lib/money"
import { fail, type ActionResult } from "./result"

// Inventory, debts and expenses: simple rows with add / edit / delete.

const optionalText = z.string().trim().nullable().optional()
const message = (e: unknown) => (e instanceof z.ZodError ? e.issues[0].message : e)

async function upsert(table: string, id: string | null, values: Record<string, unknown>, paths: string[]): Promise<ActionResult> {
  if (id) must(await db().from(table).update(values).eq("id", id))
  else must(await db().from(table).insert(values))
  for (const p of paths) revalidatePath(p)
  return { ok: true }
}

async function remove(table: string, id: string, paths: string[]): Promise<ActionResult> {
  try {
    must(await db().from(table).delete().eq("id", id))
    for (const p of paths) revalidatePath(p)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ---- Inventory ----

const InventorySchema = z.object({
  kind: z.enum(INVENTORY_KINDS),
  name: z.string().trim().min(1, "Name is required"),
  qty: z.coerce.number().min(0),
  value_usd: z.coerce.number(),
  date: z.string().min(1),
  notes: optionalText,
})
export type InventoryInput = z.input<typeof InventorySchema>
const INVENTORY_PATHS = ["/inventory", "/reports"]

export async function saveInventoryItem(id: string | null, input: InventoryInput) {
  try {
    return await upsert("inventory_items", id, InventorySchema.parse(input), INVENTORY_PATHS)
  } catch (e) {
    return fail(message(e))
  }
}
export const deleteInventoryItem = async (id: string) => remove("inventory_items", id, INVENTORY_PATHS)

// ---- Debts ----

const DebtSchema = z.object({
  direction: z.enum(["receivable", "payable"]),
  party: z.string().trim().min(1, "Name is required"),
  amount_usd: z.coerce.number().positive("Amount is required"),
  date: z.string().min(1),
  due_date: z.string().nullable().optional(),
  notes: optionalText,
})
export type DebtInput = z.input<typeof DebtSchema>
const DEBT_PATHS = ["/debts", "/reports"]

export async function saveDebt(id: string | null, input: DebtInput) {
  try {
    const values = DebtSchema.parse(input)
    return await upsert("debts", id, { ...values, due_date: values.due_date || null }, DEBT_PATHS)
  } catch (e) {
    return fail(message(e))
  }
}

/** Adds a payment to a debt (never more than what's left). */
export async function payDebt(id: string, amount: number): Promise<ActionResult> {
  try {
    if (!(amount > 0)) throw new Error("Amount is required")
    const debt = must(await db().from("debts").select("amount_usd, paid_usd").eq("id", id).single())
    const paid = Math.min(Number(debt.amount_usd), round2(Number(debt.paid_usd) + amount))
    must(await db().from("debts").update({ paid_usd: paid }).eq("id", id))
    for (const p of DEBT_PATHS) revalidatePath(p)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
export const deleteDebt = async (id: string) => remove("debts", id, DEBT_PATHS)

// ---- Expenses ----

const ExpenseSchema = z.object({
  date: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(1, "Description is required"),
  amount_usd: z.coerce.number().positive("Amount is required"),
  recurring: z.boolean(),
})
export type ExpenseInput = z.input<typeof ExpenseSchema>
const EXPENSE_PATHS = ["/expenses", "/reports"]

export async function saveExpense(id: string | null, input: ExpenseInput) {
  try {
    return await upsert("expenses", id, ExpenseSchema.parse(input), EXPENSE_PATHS)
  } catch (e) {
    return fail(message(e))
  }
}
export const deleteExpense = async (id: string) => remove("expenses", id, EXPENSE_PATHS)

// ---- Settings ----

export async function saveZakatPercent(percent: number): Promise<ActionResult> {
  try {
    const zakat_percent = z.coerce.number().min(0).max(100).parse(percent)
    must(await db().from("settings").update({ zakat_percent }).eq("id", 1))
    revalidatePath("/reports")
    return { ok: true }
  } catch (e) {
    return fail(message(e))
  }
}
