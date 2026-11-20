import { Plus } from "lucide-react"
import Link from "next/link"
import { Amount } from "@/components/amount"
import { buttonVariants } from "@/components/ui/button"
import { getLocale, getT } from "@/i18n/server"
import { formatDate } from "@/lib/dates"
import type { Receipt } from "@/lib/data/types"
import { isEnabled } from "@/lib/features"
import { receiptNumber } from "@/lib/data/receipts"

/** The receipts recorded against an invoice, with a button to record another while something is owed. */
export async function DocPayments({ receipts, recordHref }: { receipts: Receipt[]; recordHref: string | null }) {
  if (!isEnabled("receipts")) return null
  const [t, locale] = await Promise.all([getT(), getLocale()])
  return (
    <section className="mt-6 grid gap-2 print:hidden">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t("invoices.payments")}</h2>
        {recordHref && (
          <Link href={recordHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Plus /> {t("invoices.recordPayment")}
          </Link>
        )}
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {receipts.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t("invoices.noPayments")}</p>}
        {receipts.map((r) => (
          <Link key={r.id} href={`/receipts/${r.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50">
            <span>
              <span className="font-mono">{receiptNumber(r.kind, r.number)}</span>
              <span className="text-muted-foreground"> · {formatDate(r.date, locale)} · {t(`receipts.methods.${r.method}`)}</span>
            </span>
            <Amount usd={r.amount_usd} rate={r.rate_per_100} className="font-medium" />
          </Link>
        ))}
      </div>
    </section>
  )
}
