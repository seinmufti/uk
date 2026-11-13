"use server"

import { tracked } from "./tracked"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, must } from "@/lib/db"
import { parseISODate, periodRange, toISODate } from "@/lib/dates"
import { num, round2 } from "@/lib/money"
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
  base_salary_usd: z.coerce.number().min(0),
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
  return attempt(async () => must(await db().from("employees").delete().eq("id", id)))
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
      db().from("employees").select("id, base_salary_usd").eq("active", true),
      db().from("payroll").select("employee_id").eq("month", from),
      db().from("leaves").select("employee_id, from_date, to_date").eq("type", "unpaid").lte("from_date", to).gte("to_date", from),
      db().from("absences").select("employee_id, days").gte("date", from).lte("date", to),
    ])
    const done = new Set(must(existing).map((r) => r.employee_id))
    const rows = must(employees)
      .filter((e) => !done.has(e.id))
      .map((e) => {
        const base = num(e.base_salary_usd)
        const leaveDays = must(leaves)
          .filter((l) => l.employee_id === e.id)
          .reduce((s, l) => s + overlapDays(l.from_date, l.to_date, from, to), 0)
        const missing = must(absences)
          .filter((a) => a.employee_id === e.id)
          .reduce((s, a) => s + num(a.days), 0)
        return { month: from, employee_id: e.id, base_usd: base, deductions_usd: round2((base / 30) * (leaveDays + missing)) }
      })
    if (rows.length) must(await db().from("payroll").insert(rows))
  })
}

async function updatePayrollAction(id: string, values: { deductions_usd: number; bonuses_usd: number }) {
  return attempt(async () => {
    const v = z.object({ deductions_usd: z.coerce.number().min(0), bonuses_usd: z.coerce.number().min(0) }).parse(values)
    must(await db().from("payroll").update(v).eq("id", id))
    // A paid row's salary expense follows the new net amount
    const row = must(await db().from("payroll").select("base_usd, deductions_usd, bonuses_usd").eq("id", id).single())
    must(
      await db()
        .from("expenses")
        .update({ amount_usd: round2(num(row.base_usd) - num(row.deductions_usd) + num(row.bonuses_usd)) })
        .eq("payroll_id", id),
    )
  })
}

/** Paying salary records it as an expense (category: salaries); un-paying removes that expense. */
async function setPayrollPaidAction(id: string, paid: boolean) {
  return attempt(async () => {
    const row = must(await db().from("payroll").select("*, employees(name)").eq("id", id).single())
    if (paid) {
      const paidAt = toISODate(new Date())
      must(await db().from("payroll").update({ paid_at: paidAt }).eq("id", id))
      must(await db().from("expenses").delete().eq("payroll_id", id))
      const month = parseISODate(row.month).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      must(
        await db()
          .from("expenses")
          .insert({
            date: paidAt,
            category: "salaries",
            description: `Salary · ${row.employees?.name ?? ""} · ${month}`,
            amount_usd: round2(num(row.base_usd) - num(row.deductions_usd) + num(row.bonuses_usd)),
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
export const updatePayroll = tracked(updatePayrollAction)
export const setPayrollPaid = tracked(setPayrollPaidAction)
export const deletePayroll = tracked(deletePayrollAction)
