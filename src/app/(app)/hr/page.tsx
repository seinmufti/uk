import { EmployeesView } from "@/components/hr-views"
import { listEmployees } from "@/lib/data/hr"

export default async function HrPage() {
  return <EmployeesView employees={await listEmployees()} />
}
