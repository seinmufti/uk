import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ReceiptExport } from "@/components/receipt-export"
import { ReceiptActions } from "@/components/receipt-actions"
import { ReceiptSheet, type ReceiptParty } from "@/components/invoice-sheet"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { getLocale, getT } from "@/i18n/server"
import { LOCALES, type Locale } from "@/i18n/locales"
import { formatDate } from "@/lib/dates"
import { db } from "@/lib/db"
import { getReceipt, receiptNumber } from "@/lib/data/receipts"
import { iqd, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"

/** A receipt, laid out like an invoice: who paid / was paid, what for, and the amount in its own currency. */
export default async function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  const { id } = await params
  const [t, locale, r] = await Promise.all([getT(), getLocale(), getReceipt(id)])
  if (!r) notFound()
  const isIn = r.kind === "in"
  // The customer's / supplier's details for the sheet
  const partyId = isIn ? r.customer_id : r.supplier_id
  const found = partyId ? (await db().from(isIn ? "customers" : "suppliers").select("phone, address").eq("id", partyId).maybeSingle()).data : null
  const party: ReceiptParty = { name: r.party, phone: found?.phone ?? null, address: found?.address ?? null }
  const inIqd = r.currency === "iqd"
  const amount = inIqd ? iqd(usdToIqd(r.amount_usd, r.rate_per_100)) : usd(r.amount_usd)
  const cur = inIqd ? "IQD" : "USD"
  const number = receiptNumber(r.kind, r.number)
  const forLabel = r.for_label ?? t("receipts.onAccount")

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/receipts" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label={t("common.close")}>
          <ArrowLeft className="rtl:rotate-180" />
        </Link>
        <div className="ms-auto flex flex-wrap gap-2">
          <ReceiptActions id={id} />
          <ReceiptExport
            sheets={Object.fromEntries(LOCALES.map((l) => [l, <ReceiptSheet key={l} receipt={r} party={party} lang={l} />])) as Record<Locale, React.ReactNode>}
            phone={party.phone}
            name={`receipt-${number}`}
          />
        </div>
      </div>

      {/* The same card as an invoice's page */}
      <div className="rounded-xl border bg-card p-5 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("receipts.number")}</div>
            <div className="font-mono text-2xl font-semibold" dir="ltr">
              {number}
            </div>
          </div>
          <div className="text-end">
            <Badge
              variant="outline"
              className={
                isIn
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400"
              }
            >
              {t(`receipts.docTitle.${r.kind}`)}
            </Badge>
            <div className="mt-1 text-sm text-muted-foreground">{formatDate(r.date, locale)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs tracking-wide text-muted-foreground uppercase">{t(isIn ? "receipts.from" : "receipts.to")}</div>
          <div className="font-medium">{party.name}</div>
          {party.phone && (
            <div className="text-sm text-muted-foreground">
              <span dir="ltr">{party.phone}</span>
            </div>
          )}
          {party.address && <div className="text-sm text-muted-foreground">{party.address}</div>}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="w-8 py-2 text-start font-medium">#</th>
              <th className="py-2 text-start font-medium">{t("receipts.for")}</th>
              <th className="w-40 py-2 text-end font-medium">
                {t("receipts.amount")} ({cur})
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 text-muted-foreground">1</td>
              <td className="py-2">
                {r.invoice_id ? (
                  <Link href={`/invoices/${r.invoice_id}`} className="underline-offset-4 hover:underline">
                    {forLabel}
                  </Link>
                ) : (
                  forLabel
                )}
              </td>
              <td className="py-2 text-end tabular-nums">
                <span dir="ltr">{amount}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="ms-auto mt-4 grid max-w-sm gap-2 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="font-medium">{t("invoices.summary")}</div>
          <div className="flex justify-between gap-4 text-base">
            <span className="font-medium">
              {t("receipts.amount")} ({cur})
            </span>
            <bdi dir="ltr" className={cn("font-semibold tabular-nums", isIn ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400")}>
              {amount}
            </bdi>
          </div>
        </div>

        {r.notes && <p className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{r.notes}</p>}
      </div>
    </div>
  )
}
