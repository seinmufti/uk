import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { IncomeChart } from "@/components/income-chart"
import { LinkTabs } from "@/components/link-tabs"
import { PageHeader } from "@/components/page-header"
import { ZakatPercent } from "@/components/zakat-percent"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { formatDate, isPeriod, PERIODS, periodLabel, periodRange, shiftPeriod, today, type Period } from "@/lib/dates"
import { getReport } from "@/lib/data/reports"
import { iqd, usd, usdToIqd } from "@/lib/money"
import { getRate } from "@/lib/rate"
import { cn } from "@/lib/utils"

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-xl font-semibold tabular-nums", tone === "good" && "text-emerald-700 dark:text-emerald-400", tone === "bad" && "text-red-700 dark:text-red-400")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">{sub}</div>}
    </div>
  )
}

function Line({ label, value, strong, indent }: { label: string; value: number; strong?: boolean; indent?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-1 text-sm", strong && "border-t pt-2 font-semibold", indent && "ps-3")}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{usd(value)}</span>
    </div>
  )
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = await searchParams
  const t = await getT()
  const period: Period = isPeriod(params.period) ? params.period : "monthly"
  const anchor = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today()
  const { from, to } = periodRange(period, anchor)
  const [report, rate] = await Promise.all([getReport(period, from, to), getRate()])
  const inIqd = (n: number) => (rate ? iqd(usdToIqd(n, rate.rate)) : undefined)
  const href = (p: Period, d: string) => `/reports?period=${p}&date=${d}`
  const b = report.balance

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader title={t("reports.title")} />
      <div className="flex flex-wrap items-center gap-3">
        <LinkTabs active={period} tabs={PERIODS.map((p) => ({ value: p, href: href(p, anchor), label: t(`reports.period.${p}`) }))} />
        <div className="flex items-center gap-1">
          <Link href={href(period, shiftPeriod(period, anchor, -1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label={t("reports.prev")}>
            <ChevronLeft className="rtl:rotate-180" />
          </Link>
          <span className="min-w-40 px-2 text-center text-sm font-medium">{periodLabel(period, anchor)}</span>
          <Link href={href(period, shiftPeriod(period, anchor, 1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label={t("reports.next")}>
            <ChevronRight className="rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("reports.income")} value={usd(report.income)} sub={`${t("reports.invoiceCount", { count: report.invoiceCount })} · ${inIqd(report.income) ?? ""}`} />
        <Stat label={t("reports.expenses")} value={usd(report.expenses)} sub={inIqd(report.expenses)} />
        <Stat label={t("reports.purchases")} value={usd(report.purchases)} sub={inIqd(report.purchases)} />
        <Stat label={t("reports.netProfit")} value={usd(report.netProfit)} sub={inIqd(report.netProfit)} tone={report.netProfit >= 0 ? "good" : "bad"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {period !== "daily" && (
          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-sm font-medium">{t("reports.overTime")}</h2>
            <IncomeChart data={report.chart} />
          </section>
        )}
        <section className={cn("rounded-lg border p-4", period === "daily" && "lg:col-span-2")}>
          <h2 className="mb-3 text-sm font-medium">{t("reports.byCategory")}</h2>
          {report.byCategory.length === 0 && <p className="text-sm text-muted-foreground">{t("common.noData")}</p>}
          <div className="grid gap-2.5">
            {report.byCategory.map((c) => (
              <div key={c.category} className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span>{t.dynamic(`expenses.categories.${c.category}`, c.category)}</span>
                  <span className="tabular-nums">{usd(c.amount)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[#eb6834]" style={{ width: `${(c.amount / report.expenses) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-medium">{t("reports.balanceSheet")}</h2>
            <span className="text-xs text-muted-foreground">{t("reports.balanceAsOf", { date: formatDate(to) })}</span>
          </div>
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("reports.assets")}</div>
          <Line indent label={t("reports.cash")} value={b.cash} />
          <Line indent label={t("reports.stock")} value={b.stock} />
          <Line indent label={t("reports.fixedAssets")} value={b.fixedAssets} />
          <Line indent label={t("reports.receivables")} value={b.receivables} />
          <Line strong label={t("reports.totalAssets")} value={b.totalAssets} />
          <div className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("reports.liabilities")}</div>
          <Line indent label={t("reports.payables")} value={b.payables} />
          <Line strong label={t("reports.totalLiabilities")} value={b.totalLiabilities} />
          <div className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("reports.equity")}</div>
          <Line indent label={t("reports.capital")} value={b.capital} />
          <Line indent label={t("reports.retained")} value={b.retained} />
          <Line strong label={t("reports.totalEquity")} value={b.totalEquity} />
          <p className="mt-3 text-xs text-muted-foreground">
            {t("reports.cash")}: {t("reports.cashNote")}
          </p>
        </section>

        {period === "yearly" && (
          <section className="h-fit rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-medium">{t("reports.zakat")}</h2>
              <ZakatPercent value={report.zakat.percent} />
            </div>
            <Line label={t("reports.zakatBase")} value={report.zakat.base} />
            <div className="mt-2 flex items-baseline justify-between border-t pt-3">
              <span className="font-medium">{t("reports.zakatDue", { percent: report.zakat.percent })}</span>
              <span className="text-end">
                <span className="block text-xl font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">{usd(report.zakat.due)}</span>
                {inIqd(report.zakat.due) && <span className="text-xs text-muted-foreground tabular-nums">{inIqd(report.zakat.due)}</span>}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("reports.zakatNote")}</p>
          </section>
        )}
      </div>
    </div>
  )
}
