import { PartyTable } from "@/components/party-table"
import { listInvoices } from "@/lib/data/invoices"
import { listParties } from "@/lib/data/parties"
import { usd } from "@/lib/money"

export default async function CustomersPage() {
  const [customers, invoices] = await Promise.all([listParties("customers", { all: true }), listInvoices()])
  // Per customer: how many invoices and their total
  const stats: Record<string, { count: number; total: number }> = {}
  for (const inv of invoices) {
    const id = inv.customer_id
    if (!id) continue
    stats[id] ??= { count: 0, total: 0 }
    stats[id].count++
    stats[id].total += inv.total_usd
  }
  const extra = Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, `${s.count} · ${usd(s.total)}`]))
  return <PartyTable table="customers" rows={customers} extra={extra} />
}
