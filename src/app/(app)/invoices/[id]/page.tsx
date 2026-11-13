import { ArrowLeft, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { InvoiceActions } from "@/components/invoice-actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { formatDate } from "@/lib/dates"
import { getInvoice } from "@/lib/data/invoices"
import { docNumber, iqd, plain, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params
  const t = await getT()
  const invoice = await getInvoice(id)
  if (!invoice) notFound()
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
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/invoices" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label={t("common.close")}>
          <ArrowLeft className="rtl:rotate-180" />
        </Link>
        <div className="ms-auto flex flex-wrap gap-2">
          <Link href={`/invoices/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
            <Pencil /> {t("common.edit")}
          </Link>
          <InvoiceActions id={id} status={invoice.status} />
        </div>
      </div>

      <div className="rounded-xl border p-5 md:p-8 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("invoices.number")}</div>
            <div className="font-mono text-2xl font-semibold">{docNumber(invoice.number)}</div>
          </div>
          <div className="text-end">
            <Badge variant="outline" className={paid ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"}>
              {t(paid ? "invoices.status.paid" : invoice.amount_paid_usd > 0 ? "invoices.partlyPaid" : "invoices.status.unpaid")}
            </Badge>
            <div className="mt-1 text-sm text-muted-foreground">{formatDate(invoice.date)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("invoices.customer")}</div>
          <div className="font-medium">{invoice.customer?.name ?? t("invoices.noCustomer")}</div>
          {invoice.customer?.phone && (
            <div className="text-sm text-muted-foreground" dir="ltr">
              {invoice.customer.phone}
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
                <td className="py-2 text-end tabular-nums">{money(item.unit_price_usd)}</td>
                <td className="py-2 text-end tabular-nums">{money(item.total_usd)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="py-3 text-end font-medium">
                {t("invoices.grandTotal")}
              </td>
              <td className="py-3 text-end font-semibold tabular-nums">{money(invoice.total_usd)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="ms-auto mt-4 grid max-w-sm gap-2 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="font-medium">{t("invoices.summary")}</div>
          {mode === "usd_iqd" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("invoices.subtotalUsd")}</span>
              <span className="tabular-nums">{usd(invoice.total_usd)}</span>
            </div>
          )}
          {mode !== "usd" && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("invoices.exchangeRate")}</span>
              <span className="tabular-nums">{plain(invoice.rate_per_100, 0)}</span>
            </div>
          )}
          <div className={cn("flex justify-between text-base", mode !== "usd" && "border-t pt-2")}>
            <span className="font-medium">{t(mode === "usd" ? "invoices.totalUsd" : "invoices.totalIqd")}</span>
            <span className="font-semibold tabular-nums">{mode === "usd" ? usd(invoice.total_usd) : iqd(toIqd(invoice.total_usd))}</span>
          </div>
          {invoice.amount_paid_usd > 0 && !paid && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("invoices.paidAmount")}</span>
                <span className="tabular-nums">{main(invoice.amount_paid_usd)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{t("invoices.balanceDue")}</span>
                <span className="tabular-nums text-amber-700 dark:text-amber-400">{main(due)}</span>
              </div>
            </>
          )}
        </div>

        {invoice.notes && <p className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>}
      </div>
    </div>
  )
}
