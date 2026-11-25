"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { formatMonth, parseISODate, periodRange } from "@/lib/dates"
import { iqdToUsd, num, round6 } from "@/lib/money"
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
    if (id) {
      must(await db().from("employees").update(values).eq("id", id))
      // Their unpaid months follow the new salary and hiring date
      await refreshPayroll(id)
    } else must(await db().from("employees").insert(values))
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

// Leaves and absences change the leave deduction of the employee's unpaid months
async function addLeaveAction(input: LeaveInput) {
  return attempt(async () => {
    const values = LeaveSchema.parse(input)
    must(await db().from("leaves").insert(values))
    await refreshPayroll(values.employee_id)
  })
}
async function deleteLeaveAction(id: string) {
  return attempt(async () => {
    const leave = must(await db().from("leaves").delete().eq("id", id).select("employee_id").single())
    await refreshPayroll(leave.employee_id)
  })
}

const AbsenceSchema = z.object({
  employee_id: z.guid(),
  date: z.string().min(1),
  days: z.coerce.number().positive(),
  notes: z.string().trim().nullable().optional(),
})
export type AbsenceInput = z.input<typeof AbsenceSchema>

async function addAbsenceAction(input: AbsenceInput) {
  return attempt(async () => {
    const values = AbsenceSchema.parse(input)
    must(await db().from("absences").insert(values))
    await refreshPayroll(values.employee_id)
  })
}
async function deleteAbsenceAction(id: string) {
  return attempt(async () => {
    const absence = must(await db().from("absences").delete().eq("id", id).select("employee_id").single())
    await refreshPayroll(absence.employee_id)
  })
}

// ---- Payroll ----

/** Days of [from, to] that fall inside [start, end] (all yyyy-mm-dd, inclusive). */
function overlapDays(from: string, to: string, start: string, end: string) {
  const a = from > start ? from : start
  const b = to < end ? to : end
  if (a > b) return 0
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000) + 1
}

const LEAVE_REASON = "Unpaid leave and absences"

/** One employee's month as the records say: salary for the days worked, and the leave / absence deduction. */
async function monthFor(e: { id: string; base_salary_usd: unknown; start_date: string | null }, month: string) {
  const { from, to } = periodRange("monthly", month)
  const [leaves, absences] = await Promise.all([
    db().from("leaves").select("from_date, to_date").eq("employee_id", e.id).eq("type", "unpaid").lte("from_date", to).gte("to_date", from),
    db().from("absences").select("date, days").eq("employee_id", e.id).gte("date", from).lte("date", to),
  ])
  const monthDays = overlapDays(from, to, from, to)
  // Someone who started this month is paid for the days from their start date
  const worked = overlapDays(e.start_date ?? from, to, from, to)
  const base = round6((num(e.base_salary_usd) * worked) / monthDays)
  const myLeaves = must(leaves)
  const leaveDays = myLeaves.reduce((s, l) => s + overlapDays(l.from_date, l.to_date, from, to), 0)
  // An absence on a day of unpaid leave is already taken off
  const missing = must(absences)
    .filter((a) => !myLeaves.some((l) => a.date >= l.from_date && a.date <= l.to_date))
    .reduce((s, a) => s + num(a.days), 0)
  const days = leaveDays + missing
  // Never more than the salary itself
  return { from, to, base, days, deduction: Math.min(base, round6((num(e.base_salary_usd) / 30) * days)) }
}

/**
 * Brings an employee's unpaid payroll rows up to date with their record: salary (and its currency), hiring
 * date, and the leave / absence deduction. Paid months stay as they were paid.
 */
async function refreshPayroll(employeeId: string) {
  const e = must(await db().from("employees").select("id, base_salary_usd, salary_currency, salary_rate, start_date").eq("id", employeeId).single())
  const rows = must(await db().from("payroll").select("id, month, period_from, period_to").eq("employee_id", employeeId).is("paid_at", null))
  for (const row of rows) {
    const m = await monthFor(e, row.month)
    const periodFrom = e.start_date && (row.period_from ?? m.from) < e.start_date ? e.start_date : (row.period_from ?? m.from)
    must(await db().from("payroll").update({ base_usd: m.base, currency: e.salary_currency, rate_per_100: e.salary_rate, period_from: periodFrom, period_to: row.period_to ?? m.to }).eq("id", row.id))
    const auto = must(await db().from("payroll_items").select("id").eq("payroll_id", row.id).like("reason", `${LEAVE_REASON}%`))
    const reason = `${LEAVE_REASON} (${m.days} days)`
    if (m.deduction > 0 && auto.length) must(await db().from("payroll_items").update({ amount_usd: m.deduction, reason, currency: e.salary_currency, rate_per_100: e.salary_rate }).eq("id", auto[0].id))
    else if (m.deduction > 0) must(await db().from("payroll_items").insert({ payroll_id: row.id, kind: "deduction", amount_usd: m.deduction, reason, currency: e.salary_currency, rate_per_100: e.salary_rate }))
    else if (auto.length) must(await db().from("payroll_items").delete().in("id", auto.map((a) => a.id)))
    await syncPayroll(row.id)
  }
}

/**
 * Creates this month's payroll rows for active employees who don't have one yet. Deductions start at
 * salary ÷ 30 for every unpaid-leave day and missing day in the month.
 */
async function generatePayrollAction(month: string) {
  return attempt(async () => {
    const { from, to } = periodRange("monthly", month)
    const [employees, existing] = await Promise.all([
      // Only people who had started by the end of the month
      db().from("employees").select("id, base_salary_usd, salary_currency, salary_rate, start_date").eq("active", true).lte("start_date", to),
      db().from("payroll").select("employee_id").eq("month", from),
    ])
    const done = new Set(must(existing).map((r) => r.employee_id))
    for (const e of must(employees).filter((e) => !done.has(e.id))) {
      const m = await monthFor(e, from)
      const row = must(
        await db()
          .from("payroll")
          .insert({ month: from, employee_id: e.id, currency: e.salary_currency, rate_per_100: e.salary_rate, period_from: e.start_date && e.start_date > from ? e.start_date : from, period_to: to, base_usd: m.base, deductions_usd: m.deduction })
          .select("id")
          .single(),
      )
      // The leave / absence deduction is the first entry on the row (it can be changed or removed like any other)
      if (m.deduction > 0) must(await db().from("payroll_items").insert({ payroll_id: row.id, kind: "deduction", amount_usd: m.deduction, reason: `${LEAVE_REASON} (${m.days} days)`, currency: e.salary_currency, rate_per_100: e.salary_rate }))
    }
  })
}

/**
 * A payroll row's deductions and bonuses are the sums of its entries (what was paid stays as it was paid). Deductions can never be more than the salary plus bonuses.
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
}

const PayrollItemSchema = z.object({
  kind: z.enum(["bonus", "deduction"]),
  amount_usd: z.coerce.number().positive("Amount is required"),
  reason: z.string().trim().nullable().optional(),
  currency: z.enum(["usd", "iqd"]).default("usd"),
  rate_per_100: z.coerce.number().positive().nullable().optional(),
})
export type PayrollItemInput = z.input<typeof PayrollItemSchema>

/** Adds a bonus or a deduction to one employee's payroll row (or changes one: pass its id). */
async function savePayrollItemAction(payrollId: string, itemId: string | null, input: PayrollItemInput) {
  return attempt(async () => {
    const v = PayrollItemSchema.parse(input)
    const values = { ...v, amount_usd: round6(v.amount_usd), reason: v.reason || null }
    const before = itemId ? must(await db().from("payroll_items").select("kind, amount_usd, reason, currency, rate_per_100").eq("id", itemId).single()) : null
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
const PaySchema = z.object({
  usd: z.coerce.number().min(0),
  iqd: z.coerce.number().min(0),
  /** IQD per 100 USD, to value the IQD part */
  rate: z.coerce.number().positive(),
  note: z.string().trim().nullable().optional(),
})
export type PayInput = z.input<typeof PaySchema>

/** Pays one salary: what was handed over in USD and in IQD, and a note. */
async function payPayrollAction(id: string, input: PayInput) {
  return attempt(() => markPaid(id, PaySchema.parse(input)))
}

/** Un-pays a salary: its payment and salary expenses go. */
async function setPayrollPaidAction(id: string, paid: boolean) {
  return attempt(async () => {
    if (paid) throw new Error("Pay through the Mark paid form")
    must(await db().from("payroll").update({ paid_at: null, paid_usd: null, paid_iqd: null, paid_note: null }).eq("id", id))
    must(await db().from("expenses").delete().eq("payroll_id", id))
  })
}

/** Pays each of these their expected net at once; anyone already paid is left as is. One change in the history. */
async function payAllPayrollAction(payments: { id: string; usd: number; iqd: number; rate: number }[]) {
  return attempt(async () => {
    for (const p of payments) await markPaid(z.guid().parse(p.id), PaySchema.parse(p))
  })
}

/**
 * Marks a salary paid on its period's To date and records it as salary expenses: one in USD and one in IQD
 * for what was handed over in each (so neither is converted). A salary already paid is never paid again.
 */
async function markPaid(id: string, pay: z.output<typeof PaySchema>) {
  const row = must(await db().from("payroll").select("*, employees(name)").eq("id", id).single())
  if (row.paid_at) return
  if (!row.included) throw new Error("Tick the employee into this month's payroll first")
  if (pay.usd <= 0 && pay.iqd <= 0) throw new Error("Amount is required")
  // On the period's To date; a row without one (e.g. brought back by Undo) is for the whole month
  const paidAt = row.period_to || periodRange("monthly", row.month).to
  must(await db().from("payroll").update({ paid_at: paidAt, paid_usd: round6(pay.usd), paid_iqd: Math.round(pay.iqd), paid_note: pay.note || null }).eq("id", id))
  must(await db().from("expenses").delete().eq("payroll_id", id))
  const description = `Salary · ${row.employees?.name ?? ""} · ${formatMonth(row.month)}${pay.note ? ` · ${pay.note}` : ""}`
  const expenses = [
    pay.usd > 0 && { date: paidAt, category: "salaries", description, amount_usd: round6(pay.usd), currency: "usd", rate_per_100: pay.rate, payroll_id: id },
    pay.iqd > 0 && { date: paidAt, category: "salaries", description, amount_usd: round6(iqdToUsd(Math.round(pay.iqd), pay.rate)), currency: "iqd", rate_per_100: pay.rate, payroll_id: id },
  ].filter(Boolean)
  must(await db().from("expenses").insert(expenses))
}

/** The period a salary is for. It's paid on the To date, so a paid one (and its salary expense) moves with it. */
async function setPayPeriodAction(id: string, from: string, to: string) {
  return attempt(async () => {
    const period_from = z.iso.date().parse(from)
    const period_to = z.iso.date().parse(to)
    if (period_to < period_from) throw new Error("The To date is before the From date")
    const row = must(await db().from("payroll").select("paid_at").eq("id", id).single())
    must(await db().from("payroll").update({ period_from, period_to, ...(row.paid_at ? { paid_at: period_to } : {}) }).eq("id", id))
    if (row.paid_at) must(await db().from("expenses").update({ date: period_to }).eq("payroll_id", id))
  })
}

/** Puts an employee in or out of this month's payroll (a paid salary has to be un-paid first). */
async function setPayrollIncludedAction(id: string, included: boolean) {
  return attempt(async () => {
    const row = must(await db().from("payroll").select("paid_at").eq("id", id).single())
    if (row.paid_at && !included) throw new Error("This salary is paid. Un-pay it first.")
    must(await db().from("payroll").update({ included }).eq("id", id))
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
export const payPayroll = tracked(payPayrollAction)
export const payAllPayroll = tracked(payAllPayrollAction)
export const deletePayroll = tracked(deletePayrollAction)
export const setPayPeriod = tracked(setPayPeriodAction)
export const setPayrollIncluded = tracked(setPayrollIncludedAction)
