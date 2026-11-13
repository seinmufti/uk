import { ExpensesView } from "@/components/expenses-view"
import { periodRange, today } from "@/lib/dates"
import { listExpenses } from "@/lib/data/records"

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const params = await searchParams
  const month = periodRange("monthly", today())
  const from = isDate(params.from) ? params.from : month.from
  const to = isDate(params.to) ? params.to : month.to
  const category = typeof params.category === "string" ? params.category : ""
  const expenses = (await listExpenses({ from, to })).filter((e) => !category || e.category === category)
  return <ExpensesView expenses={expenses} from={from} to={to} category={category} />
}
