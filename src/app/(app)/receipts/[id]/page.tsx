import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ReceiptActions } from "@/components/receipt-actions"
import { buttonVariants } from "@/components/ui/button"
import { getLocale, getT } from "@/i18n/server"
import { formatDate } from "@/lib/dates"
import { getReceipt, receiptNumber } from "@/lib/data/receipts"
import { iqd, plain, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"

export default async function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  const { id } = await params
  const t = await getT()
  const r = await getReceipt(id)
  if (!r) notFound()
  const isIn = r.kind === "in"

  const rows: [string, React.ReactNode][] = [
    [t(isIn ? "receipts.from" : "receipts.to"), <span key="p" className="font-medium">{r.party}</span>],
    [t("receipts.for"), r.for_label ?? t("receipts.onAccount")],
    [t("receipts.method"), t(`receipts.methods.${r.method}`)],
    [t("receipts.exchangeRate"), <span key="r" className="tabular-nums">{plain(r.rate_per_100, 0)}</span>],
  ]

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/receipts" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label={t("common.close")}>
          <ArrowLeft className="rtl:rotate-180" />
        </Link>
        <div className="ms-auto flex flex-wrap gap-2">
          <ReceiptActions id={id} printLabel={t("common.print")} printIcon={<Printer />} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm md:p-8 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">{t(`receipts.docTitle.${r.kind}`)}</div>
            <div className="font-mono text-2xl font-semibold">{receiptNumber(r.kind, r.number)}</div>
          </div>
          <div className="text-end text-sm text-muted-foreground">{formatDate(r.date, await getLocale())}</div>
        </div>

        <dl className="mt-6 grid gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b pb-2 last:border-b-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-end">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-1 rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("receipts.amount")}</span>
            <span className={cn("text-2xl font-semibold tabular-nums", isIn ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400")}>
              {usd(r.amount_usd)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("receipts.amountIqd")}</span>
            <span className="font-medium tabular-nums">{iqd(usdToIqd(r.amount_usd, r.rate_per_100))}</span>
          </div>
        </div>

        {r.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-muted-foreground">{r.notes}</p>}

        <div className="mt-12 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
          <div className="border-t pt-1">{t("receipts.signature")}</div>
          <div className="border-t pt-1 text-end">{t("receipts.signature")}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground print:hidden">{t("receipts.deleteNote")}</p>
    </div>
  )
}
