import { PartyTable } from "@/components/party-table"
import { listInvoices } from "@/lib/data/invoices"
import { listParties } from "@/lib/data/parties"
import { iqd, usd, usdToIqd } from "@/lib/money"
import { getRate } from "@/lib/rate"

export default async function CustomersPage() {
  const [customers, invoices, rate] = await Promise.all([listParties("customers", { all: true }), listInvoices(), getRate()])
  // Per customer: how many invoices and their total
  const stats: Record<string, { count: number; total: number }> = {}
  for (const inv of invoices) {
    const id = inv.customer_id
    if (!id) continue
    stats[id] ??= { count: 0, total: 0 }
    stats[id].count++
    stats[id].total += inv.total_usd
  }
  const extra = Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, `${s.count} · ${usd(s.total)}${rate ? ` · ${iqd(usdToIqd(s.total, rate.rate))}` : ""}`]))
  return <PartyTable table="customers" rows={customers} extra={extra} />
}
