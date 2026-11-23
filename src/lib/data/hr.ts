import "server-only"
import { db, must } from "@/lib/db"
import { num } from "@/lib/money"
import type { Absence, Employee, Leave, PayrollRow } from "./types"

const toEmployee = (r: Record<string, unknown>) => ({ ...r, base_salary_usd: num(r.base_salary_usd), salary_rate: r.salary_rate == null ? null : num(r.salary_rate) }) as Employee

export async function listEmployees(): Promise<Employee[]> {
  return must(await db().from("employees").select("*").order("active", { ascending: false }).order("name")).map(toEmployee)
}

export async function getEmployee(id: string): Promise<{ employee: Employee; leaves: Leave[]; absences: Absence[] } | null> {
  const { data } = await db().from("employees").select("*").eq("id", id).maybeSingle()
  if (!data) return null
  const [leaves, absences] = await Promise.all([
    db().from("leaves").select("*").eq("employee_id", id).order("from_date", { ascending: false }),
    db().from("absences").select("*").eq("employee_id", id).order("date", { ascending: false }),
  ])
  return {
    employee: toEmployee(data),
    leaves: must(leaves),
    absences: must(absences).map((a) => ({ ...a, days: num(a.days) })),
  }
}

export async function listPayroll(month: string): Promise<PayrollRow[]> {
  const rows = must(await db().from("payroll").select("*, employees(name), payroll_items(id, kind, amount_usd, reason, created_at)").eq("month", month)) as (Record<string, unknown> & { employees: { name: string } | null; payroll_items: { id: string; kind: "bonus" | "deduction"; amount_usd: string; reason: string | null; created_at: string }[] })[]
  return rows
    .map(({ employees, payroll_items, ...r }) => ({
      ...(r as unknown as PayrollRow),
      employee_name: employees?.name ?? "—",
      base_usd: num(r.base_usd),
      deductions_usd: num(r.deductions_usd),
      bonuses_usd: num(r.bonuses_usd),
      rate_per_100: r.rate_per_100 == null ? null : num(r.rate_per_100),
      items: [...payroll_items].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((i) => ({ id: i.id, kind: i.kind, amount_usd: num(i.amount_usd), reason: i.reason })),
    }))
    .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
}
