import { Badge } from "@/components/ui/badge"
import type { Locale } from "@/i18n/locales"
import type { Translate } from "@/i18n/translate"
import type { Invoice } from "@/lib/data/types"
import { formatDate } from "@/lib/dates"
import { docNumber, iqd, plain, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * The invoice itself, as shown on its page and on the print / PDF page. Written in whatever
 * language `t` is for, so an invoice can be printed in a language other than the app's.
 */
export function InvoiceDocument({ invoice, t, locale = "en", className }: { invoice: Invoice; t: Translate; locale?: Locale; className?: string }) {
  const paid = invoice.status === "paid"
  // How this invoice shows its money (chosen on the form)
  const mode = invoice.currency_mode
  const toIqd = (n: number) => usdToIqd(n, invoice.rate_per_100)
  const money = (n: number) => (mode === "iqd" ? iqd(toIqd(n)) : usd(n))
  const cur = mode === "iqd" ? "IQD" : "USD"
  const due = Math.max(0, invoice.total_usd - invoice.amount_paid_usd)
  // Totals in the invoice's main currency (USD, or IQD in the IQD and USD → IQD modes)
  const main = (n: number) => (mode === "usd" ? usd(n) : iqd(toIqd(n)))

  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm md:p-8 print:border-0 print:p-0 print:shadow-none", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("invoices.number")}</div>
          <div className="font-mono text-2xl font-semibold" dir="ltr">
            {docNumber(invoice.number)}
          </div>
        </div>
        <div className="text-end">
          <Badge variant="outline" className={paid ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"}>
            {t(paid ? "invoices.status.paid" : invoice.amount_paid_usd > 0 ? "invoices.partlyPaid" : "invoices.status.unpaid")}
          </Badge>
          <div className="mt-1 text-sm text-muted-foreground">{formatDate(invoice.date, locale)}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("invoices.customer")}</div>
        <div className="font-medium">{invoice.customer?.name ?? t("invoices.noCustomer")}</div>
        {invoice.customer?.phone && (
          <div className="text-sm text-muted-foreground">
            <span dir="ltr">{invoice.customer.phone}</span>
          </div>
        )}
        {invoice.customer?.address && <div className="text-sm text-muted-foreground">{invoice.customer.address}</div>}
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="w-8 py-2 text-start font-medium">#</th>
            <th className="py-2 text-start font-medium">{t("common.description")}</th>
            <th className="w-20 py-2 text-end font-medium">{t("common.qty")}</th>
            <th className="w-32 py-2 text-end font-medium">
              {t("invoices.cost")} ({cur})
            </th>
            <th className="w-32 py-2 text-end font-medium">
              {t("common.total")} ({cur})
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 text-muted-foreground">{i + 1}</td>
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-end tabular-nums">{plain(item.qty, 3)}</td>
              <td className="py-2 text-end tabular-nums"><span dir="ltr">{money(item.unit_price_usd)}</span></td>
              <td className="py-2 text-end tabular-nums"><span dir="ltr">{money(item.total_usd)}</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="py-3 text-end font-medium">
              {t("invoices.grandTotal")}
            </td>
            <td className="py-3 text-end font-semibold tabular-nums"><span dir="ltr">{money(invoice.total_usd)}</span></td>
          </tr>
        </tfoot>
      </table>

      <div className="ms-auto mt-4 grid max-w-sm gap-2 rounded-lg bg-muted/50 p-4 text-sm print:border">
        <div className="font-medium">{t("invoices.summary")}</div>
        {mode === "usd_iqd" && (
          <Line label={t("invoices.subtotalUsd")} value={usd(invoice.total_usd)} />
        )}
        {mode !== "usd" && <Line label={t("invoices.exchangeRate")} value={plain(invoice.rate_per_100, 0)} />}
        <div className={cn("flex justify-between gap-4 text-base", mode !== "usd" && "border-t pt-2")}>
          <span className="font-medium">{t(mode === "usd" ? "invoices.totalUsd" : "invoices.totalIqd")}</span>
          <span className="font-semibold tabular-nums"><bdi dir="ltr">{mode === "usd" ? usd(invoice.total_usd) : iqd(toIqd(invoice.total_usd))}</bdi></span>
        </div>
        {invoice.amount_paid_usd > 0 && !paid && (
          <>
            <Line label={t("invoices.paidAmount")} value={main(invoice.amount_paid_usd)} />
            <div className="flex justify-between gap-4 font-medium">
              <span>{t("invoices.balanceDue")}</span>
              <span className="tabular-nums text-amber-700 dark:text-amber-400"><bdi dir="ltr">{main(due)}</bdi></span>
            </div>
          </>
        )}
      </div>

      {invoice.notes && <p className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>}
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums"><bdi dir="ltr">{value}</bdi></span>
    </div>
  )
}
