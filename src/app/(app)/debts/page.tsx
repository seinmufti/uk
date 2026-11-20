import { DebtsView } from "@/components/debts-view"
import { listDebts } from "@/lib/data/records"
import type { DebtDirection } from "@/lib/data/types"

export default async function DebtsPage({ searchParams }: PageProps<"/debts">) {
  const { tab } = await searchParams
  const direction: DebtDirection = tab === "payable" ? "payable" : "receivable"
  const debts = await listDebts()
  // What is still owed on the debts recorded here (unpaid invoices are followed on the Invoices page)
  const outstanding = (d: DebtDirection) => debts.filter((x) => x.direction === d).reduce((s, x) => s + Math.max(0, x.amount_usd - x.paid_usd), 0)
  const totals = { receivable: outstanding("receivable"), payable: outstanding("payable") }
  return <DebtsView direction={direction} debts={debts.filter((d) => d.direction === direction)} totals={totals} />
}
