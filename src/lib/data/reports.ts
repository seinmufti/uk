import "server-only"
import { db, must } from "@/lib/db"
import { parseISODate, toISODate, type Period } from "@/lib/dates"
import { num, round2 } from "@/lib/money"

export type Bucket = { label: string; income: number; expenses: number }

/** Splits [from, to] into chart buckets: days for a week or month, months for a quarter or year. */
function buckets(period: Period, from: string, to: string) {
  const out: { label: string; from: string; to: string }[] = []
  if (period === "daily") return [{ label: from, from, to }]
  const start = parseISODate(from)
  const end = parseISODate(to)
  if (period === "weekly" || period === "monthly") {
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = toISODate(d)
      out.push({ label: period === "weekly" ? d.toLocaleDateString("en-GB", { weekday: "short" }) : String(d.getDate()), from: iso, to: iso })
    }
  } else {
    for (const d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1, 1)) {
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      out.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), from: toISODate(d), to: toISODate(last) })
    }
  }
  return out
}

/** Everything the reports page shows for one period, plus the balance sheet as of the period's end. */
export async function getReport(period: Period, from: string, to: string) {
  const [invoices, expenses, purchases, inventory, debts, settings] = await Promise.all([
    db().from("invoices").select("date, status, invoice_items(total_usd)").lte("date", to),
    db().from("expenses").select("date, category, amount_usd").lte("date", to),
    db().from("purchases").select("date, amount_paid_usd, purchase_items(qty, unit_cost_usd)").lte("date", to),
    db().from("inventory_items").select("kind, value_usd, date").lte("date", to),
    db().from("debts").select("direction, amount_usd, paid_usd, purchase_id, date").lte("date", to),
    db().from("settings").select("zakat_percent").eq("id", 1).single(),
  ])

  const inv = must(invoices).map((i) => ({ date: i.date as string, paid: i.status === "paid", total: i.invoice_items.reduce((s: number, x: { total_usd: string }) => s + num(x.total_usd), 0) }))
  const exp = must(expenses).map((e) => ({ date: e.date as string, category: e.category as string, amount: num(e.amount_usd) }))
  const pur = must(purchases).map((p) => ({
    date: p.date as string,
    paid: num(p.amount_paid_usd),
    total: p.purchase_items.reduce((s: number, x: { qty: string; unit_cost_usd: string }) => s + num(x.qty) * num(x.unit_cost_usd), 0),
  }))
  const inRange = (d: string) => d >= from && d <= to
  const sum = <T,>(rows: T[], pick: (r: T) => number) => round2(rows.reduce((s, r) => s + pick(r), 0))

  // ---- The period ----
  const periodInvoices = inv.filter((i) => inRange(i.date))
  const income = sum(periodInvoices, (i) => i.total)
  const incomeUnpaid = sum(
    periodInvoices.filter((i) => !i.paid),
    (i) => i.total,
  )
  const periodExpenses = exp.filter((e) => inRange(e.date))
  const expenseTotal = sum(periodExpenses, (e) => e.amount)
  const purchaseTotal = sum(
    pur.filter((p) => inRange(p.date)),
    (p) => p.total,
  )
  const byCategory = Object.entries(
    periodExpenses.reduce<Record<string, number>>((acc, e) => ((acc[e.category] = (acc[e.category] ?? 0) + e.amount), acc), {}),
  )
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount)
  const chart: Bucket[] = buckets(period, from, to).map((b) => ({
    label: b.label,
    income: sum(
      inv.filter((i) => i.date >= b.from && i.date <= b.to),
      (i) => i.total,
    ),
    expenses: sum(
      exp.filter((e) => e.date >= b.from && e.date <= b.to),
      (e) => e.amount,
    ),
  }))

  // ---- Balance sheet as of `to` ----
  const items = must(inventory).map((i) => ({ kind: i.kind as string, value: num(i.value_usd) }))
  const kindTotal = (k: string) =>
    sum(
      items.filter((i) => i.kind === k),
      (i) => i.value,
    )
  const capital = kindTotal("capital")
  const stock = kindTotal("stock")
  const fixedAssets = kindTotal("asset")
  const allDebts = must(debts).map((d) => ({ direction: d.direction as string, amount: num(d.amount_usd), paid: num(d.paid_usd), fromPurchase: !!d.purchase_id }))
  const receivableDebts = allDebts.filter((d) => d.direction === "receivable")
  const payableDebts = allDebts.filter((d) => d.direction === "payable")
  const receivables = round2(
    sum(
      inv.filter((i) => !i.paid),
      (i) => i.total,
    ) + sum(receivableDebts, (d) => Math.max(0, d.amount - d.paid)),
  )
  const payables = sum(payableDebts, (d) => Math.max(0, d.amount - d.paid))
  // Money in: capital, paid invoices, debt payments collected. Money out: expenses, purchases paid, debt payments made.
  const cash = round2(
    capital +
      sum(
        inv.filter((i) => i.paid),
        (i) => i.total,
      ) +
      sum(receivableDebts, (d) => d.paid) -
      sum(exp, (e) => e.amount) -
      sum(pur, (p) => p.paid) -
      sum(payableDebts, (d) => d.paid),
  )
  const totalAssets = round2(cash + stock + fixedAssets + receivables)
  const totalLiabilities = payables
  const totalEquity = round2(totalAssets - totalLiabilities)
  const zakatPercent = num(must(settings).zakat_percent)
  const zakatBase = Math.max(0, round2(cash + stock + receivables - payables))

  return {
    income,
    incomeUnpaid,
    invoiceCount: periodInvoices.length,
    expenses: expenseTotal,
    purchases: purchaseTotal,
    netProfit: round2(income - expenseTotal - purchaseTotal),
    byCategory,
    chart,
    balance: {
      cash,
      stock,
      fixedAssets,
      receivables,
      totalAssets,
      payables,
      totalLiabilities,
      capital,
      retained: round2(totalEquity - capital),
      totalEquity,
    },
    zakat: { percent: zakatPercent, base: zakatBase, due: round2((zakatBase * zakatPercent) / 100) },
  }
}

export type Report = Awaited<ReturnType<typeof getReport>>
