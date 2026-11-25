import { EmployeesView } from "@/components/hr-views"
import { listEmployees } from "@/lib/data/hr"

export default async function HrPage({ searchParams }: PageProps<"/hr">) {
  // ?highlight=<id>: coming from a name in Payroll
  const { highlight } = await searchParams
  return <EmployeesView employees={await listEmployees()} highlight={typeof highlight === "string" ? highlight : undefined} />
}
