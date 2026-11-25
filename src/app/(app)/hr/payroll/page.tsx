import { PayrollView } from "@/components/hr-views"
import { periodRange, today } from "@/lib/dates"
import { db, must } from "@/lib/db"
import { listPayroll } from "@/lib/data/hr"

export default async function PayrollPage({ searchParams }: PageProps<"/hr/payroll">) {
  const { month: param } = await searchParams
  const month = `${typeof param === "string" && /^\d{4}-\d{2}$/.test(param) ? param : today().slice(0, 7)}-01`
  const [rows, active] = await Promise.all([
    listPayroll(month),
    // Everyone who works here this month (the same people the month's rows are made for)
    db().from("employees").select("id, active, start_date, salary_currency, salary_rate"),
  ])
  const { to } = periodRange("monthly", month)
  const employees = must(active)
  const missing = employees.filter((e) => e.active && e.start_date <= to && !rows.some((r) => r.employee_id === e.id)).length
  // An unpaid row made before its employee's salary changed currency (or rate) is brought up to date too
  const stale = rows.filter((r) => {
    const e = employees.find((x) => x.id === r.employee_id)
    return !r.paid_at && e && (r.currency !== e.salary_currency || Number(r.rate_per_100 ?? 0) !== Number(e.salary_rate ?? 0))
  }).length
  return <PayrollView month={month} rows={rows} missing={missing + stale} />
}
