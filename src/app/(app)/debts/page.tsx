import { DebtsView } from "@/components/debts-view"
import { listInvoices } from "@/lib/data/invoices"
import { listDebts } from "@/lib/data/records"
import type { DebtDirection } from "@/lib/data/types"

export default async function DebtsPage({ searchParams }: PageProps<"/debts">) {
  const { tab } = await searchParams
  const direction: DebtDirection = tab === "payable" ? "payable" : "receivable"
  const [debts, invoices] = await Promise.all([listDebts(), listInvoices()])
  const unpaidInvoices = invoices.filter((i) => i.status === "unpaid")
  const outstanding = (d: DebtDirection) => debts.filter((x) => x.direction === d).reduce((s, x) => s + Math.max(0, x.amount_usd - x.paid_usd), 0)
  const totals = {
    receivable: outstanding("receivable") + unpaidInvoices.reduce((s, i) => s + i.total_usd, 0),
    payable: outstanding("payable"),
  }
  return <DebtsView direction={direction} debts={debts.filter((d) => d.direction === direction)} unpaidInvoices={unpaidInvoices} totals={totals} />
}
