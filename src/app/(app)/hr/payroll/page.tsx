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
    db().from("employees").select("id").eq("active", true).lte("start_date", periodRange("monthly", month).to),
  ])
  const missing = must(active).filter((e) => !rows.some((r) => r.employee_id === e.id)).length
  return <PayrollView month={month} rows={rows} missing={missing} />
}
