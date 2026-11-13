import { PayrollView } from "@/components/hr-views"
import { today } from "@/lib/dates"
import { listPayroll } from "@/lib/data/hr"

export default async function PayrollPage({ searchParams }: PageProps<"/hr/payroll">) {
  const { month: param } = await searchParams
  const month = `${typeof param === "string" && /^\d{4}-\d{2}$/.test(param) ? param : today().slice(0, 7)}-01`
  return <PayrollView month={month} rows={await listPayroll(month)} />
}
