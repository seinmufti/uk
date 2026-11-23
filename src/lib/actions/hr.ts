"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { formatMonth, parseISODate, periodRange, today } from "@/lib/dates"
import { num, round6 } from "@/lib/money"
import { fail, type ActionResult } from "./result"

const message = (e: unknown) => (e instanceof z.ZodError ? e.issues[0].message : e)
const refresh = () => {
  revalidatePath("/hr", "layout")
  revalidatePath("/expenses")
  revalidatePath("/reports")
}

async function attempt(work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work()
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(message(e))
  }
}

// ---- Employees ----

const EmployeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  position: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  base_salary_usd: z.coerce.number().min(0).transform(round6),
  // The currency the salary is set in and the rate then (an IQD salary stays exactly the same in IQD)
  salary_currency: z.enum(["usd", "iqd"]).default("usd"),
  salary_rate: z.coerce.number().positive().nullable().optional(),
  start_date: z.string().min(1),
  active: z.boolean(),
  notes: z.string().trim().nullable().optional(),
})
export type EmployeeInput = z.input<typeof EmployeeSchema>

async function saveEmployeeAction(id: string | null, input: EmployeeInput) {
  return attempt(async () => {
    const values = EmployeeSchema.parse(input)
    if (id) must(await db().from("employees").update(values).eq("id", id))
    else must(await db().from("employees").insert(values))
  })
}

async function deleteEmployeeAction(id: string) {
  return attempt(async () => {
    // Deleting would also delete their payroll and its salary expenses, changing past reports
    const paid = must(await db().from("payroll").select("id").eq("employee_id", id).not("paid_at", "is", null).limit(1))
    if (paid.length) throw new Error("This employee has paid salaries on record. Mark them inactive instead of deleting.")
    must(await db().from("employees").delete().eq("id", id))
  })
}

// ---- Leaves & absences ----

const LeaveSchema = z
  .object({
    employee_id: z.guid(),
    from_date: z.string().min(1),
    to_date: z.string().min(1),
    type: z.enum(["paid", "unpaid", "sick"]),
    notes: z.string().trim().nullable().optional(),
  })
  .refine((l) => l.to_date >= l.from_date, "The end date is before the start date")
export type LeaveInput = z.input<typeof LeaveSchema>

async function addLeaveAction(input: LeaveInput) {
  return attempt(async () => must(await db().from("leaves").insert(LeaveSchema.parse(input))))
}
async function deleteLeaveAction(id: string) {
  return attempt(async () => must(await db().from("leaves").delete().eq("id", id)))
}

const AbsenceSchema = z.object({
  employee_id: z.guid(),
  date: z.string().min(1),
  days: z.coerce.number().positive(),
  notes: z.string().trim().nullable().optional(),
})
export type AbsenceInput = z.input<typeof AbsenceSchema>

async function addAbsenceAction(input: AbsenceInput) {
  return attempt(async () => must(await db().from("absences").insert(AbsenceSchema.parse(input))))
}
async function deleteAbsenceAction(id: string) {
  return attempt(async () => must(await db().from("absences").delete().eq("id", id)))
}

// ---- Payroll ----

/** Days of [from, to] that fall inside [start, end] (all yyyy-mm-dd, inclusive). */
function overlapDays(from: string, to: string, start: string, end: string) {
  const a = from > start ? from : start
  const b = to < end ? to : end
  if (a > b) return 0
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000) + 1
}

/**
 * Creates this month's payroll rows for active employees who don't have one yet. Deductions start at
 * salary ÷ 30 for every unpaid-leave day and missing day in the month.
 */
async function generatePayrollAction(month: string) {
  return attempt(async () => {
    const { from, to } = periodRange("monthly", month)
    const [employees, existing, leaves, absences] = await Promise.all([
      // Only people who had started by the end of the month
      db().from("employees").select("id, base_salary_usd, salary_currency, salary_rate, start_date").eq("active", true).lte("start_date", to),
      db().from("payroll").select("employee_id").eq("month", from),
      db().from("leaves").select("employee_id, from_date, to_date").eq("type", "unpaid").lte("from_date", to).gte("to_date", from),
      db().from("absences").select("employee_id, date, days").gte("date", from).lte("date", to),
    ])
    const done = new Set(must(existing).map((r) => r.employee_id))
    const monthDays = overlapDays(from, to, from, to)
    const rows = must(employees)
      .filter((e) => !done.has(e.id))
      .map((e) => {
        // Someone who started this month is paid for the days from their start date
        const worked = overlapDays(e.start_date ?? from, to, from, to)
        const base = round6((num(e.base_salary_usd) * worked) / monthDays)
        const myLeaves = must(leaves).filter((l) => l.employee_id === e.id)
        const leaveDays = myLeaves.reduce((s, l) => s + overlapDays(l.from_date, l.to_date, from, to), 0)
        // An absence on a day of unpaid leave is already taken off
        const missing = must(absences)
          .filter((a) => a.employee_id === e.id && !myLeaves.some((l) => a.date >= l.from_date && a.date <= l.to_date))
          .reduce((s, a) => s + num(a.days), 0)
        // Never more than the salary itself
        return { month: from, employee_id: e.id, currency: e.salary_currency, rate_per_100: e.salary_rate, base_usd: base, deductions_usd: Math.min(base, round6((num(e.base_salary_usd) / 30) * (leaveDays + missing))), days: leaveDays + missing }
      })
    if (!rows.length) return
    const saved = must(await db().from("payroll").insert(rows.map((r) => ({ month: r.month, employee_id: r.employee_id, currency: r.currency, rate_per_100: r.rate_per_100, base_usd: r.base_usd, deductions_usd: r.deductions_usd }))).select("id, employee_id"))
    // The leave / absence deduction is the first entry on the row (it can be changed or removed like any other)
    const auto = rows
      .filter((r) => r.deductions_usd > 0)
      .map((r) => ({ payroll_id: saved.find((x) => x.employee_id === r.employee_id)!.id, kind: "deduction", amount_usd: r.deductions_usd, reason: `Unpaid leave and absences (${r.days} days)` }))
    if (auto.length) must(await db().from("payroll_items").insert(auto))
  })
}

/**
 * A payroll row's deductions and bonuses are the sums of its entries; a paid row's salary expense follows
 * the new net amount. Deductions can never be more than the salary plus bonuses.
 */
async function syncPayroll(payrollId: string) {
  const [row, items] = await Promise.all([
    db().from("payroll").select("base_usd").eq("id", payrollId).single(),
    db().from("payroll_items").select("kind, amount_usd").eq("payroll_id", payrollId),
  ])
  const sum = (kind: string) => round6(must(items).filter((i) => i.kind === kind).reduce((s, i) => s + num(i.amount_usd), 0))
  const deductions = sum("deduction")
  const bonuses = sum("bonus")
  const base = num(must(row).base_usd)
  if (deductions > base + bonuses) throw new Error("Deductions can't be more than the salary")
  must(await db().from("payroll").update({ deductions_usd: deductions, bonuses_usd: bonuses }).eq("id", payrollId))
  must(await db().from("expenses").update({ amount_usd: round6(base - deductions + bonuses) }).eq("payroll_id", payrollId))
}

const PayrollItemSchema = z.object({
  kind: z.enum(["bonus", "deduction"]),
  amount_usd: z.coerce.number().positive("Amount is required"),
  reason: z.string().trim().nullable().optional(),
})
export type PayrollItemInput = z.input<typeof PayrollItemSchema>

/** Adds a bonus or a deduction to one employee's payroll row (or changes one: pass its id). */
async function savePayrollItemAction(payrollId: string, itemId: string | null, input: PayrollItemInput) {
  return attempt(async () => {
    const v = PayrollItemSchema.parse(input)
    const values = { ...v, amount_usd: round6(v.amount_usd), reason: v.reason || null }
    const before = itemId ? must(await db().from("payroll_items").select("kind, amount_usd, reason").eq("id", itemId).single()) : null
    const id = itemId
      ? (must(await db().from("payroll_items").update(values).eq("id", itemId)), itemId)
      : must(await db().from("payroll_items").insert({ ...values, payroll_id: payrollId }).select("id").single()).id
    try {
      await syncPayroll(payrollId)
    } catch (e) {
      // Too big a deduction: put the entry back as it was
      if (before) must(await db().from("payroll_items").update(before).eq("id", id))
      else must(await db().from("payroll_items").delete().eq("id", id))
      throw e
    }
  })
}

async function deletePayrollItemAction(itemId: string) {
  return attempt(async () => {
    const item = must(await db().from("payroll_items").select("payroll_id").eq("id", itemId).single())
    must(await db().from("payroll_items").delete().eq("id", itemId))
    await syncPayroll(item.payroll_id)
  })
}

/** Paying salary records it as an expense (category: salaries); un-paying removes that expense. */
async function setPayrollPaidAction(id: string, paid: boolean) {
  return attempt(async () => {
    const row = must(await db().from("payroll").select("*, employees(name)").eq("id", id).single())
    if (paid) {
      const paidAt = today()
      must(await db().from("payroll").update({ paid_at: paidAt }).eq("id", id))
      must(await db().from("expenses").delete().eq("payroll_id", id))
      const month = formatMonth(row.month)
      must(
        await db()
          .from("expenses")
          .insert({
            date: paidAt,
            category: "salaries",
            description: `Salary · ${row.employees?.name ?? ""} · ${month}`,
            amount_usd: round6(num(row.base_usd) - num(row.deductions_usd) + num(row.bonuses_usd)),
            // In the salary's own currency
            currency: row.currency,
            rate_per_100: row.rate_per_100,
            payroll_id: id,
          }),
      )
    } else {
      must(await db().from("payroll").update({ paid_at: null }).eq("id", id))
      must(await db().from("expenses").delete().eq("payroll_id", id))
    }
  })
}

async function deletePayrollAction(id: string) {
  return attempt(async () => must(await db().from("payroll").delete().eq("id", id)))
}

// Each action is one change in the history (undo / redo as a unit)
export const saveEmployee = tracked(saveEmployeeAction)
export const deleteEmployee = tracked(deleteEmployeeAction)
export const addLeave = tracked(addLeaveAction)
export const deleteLeave = tracked(deleteLeaveAction)
export const addAbsence = tracked(addAbsenceAction)
export const deleteAbsence = tracked(deleteAbsenceAction)
export const generatePayroll = tracked(generatePayrollAction)
export const savePayrollItem = tracked(savePayrollItemAction)
export const deletePayrollItem = tracked(deletePayrollItemAction)
export const setPayrollPaid = tracked(setPayrollPaidAction)
export const deletePayroll = tracked(deletePayrollAction)
