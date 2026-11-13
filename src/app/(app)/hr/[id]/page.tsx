import { notFound } from "next/navigation"
import { EmployeeDetail } from "@/components/hr-views"
import { getEmployee } from "@/lib/data/hr"

export default async function EmployeePage({ params }: PageProps<"/hr/[id]">) {
  const { id } = await params
  const data = await getEmployee(id)
  if (!data) notFound()
  return <EmployeeDetail {...data} />
}
