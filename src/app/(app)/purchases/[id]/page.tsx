import { ArrowLeft, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PurchaseActions } from "@/components/purchase-actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { formatDate } from "@/lib/dates"
import { getPurchase } from "@/lib/data/purchases"
import { docNumber, plain, round2, usd } from "@/lib/money"
import { cn } from "@/lib/utils"

export default async function PurchasePage({ params }: PageProps<"/purchases/[id]">) {
  const { id } = await params
  const t = await getT()
  const p = await getPurchase(id)
  if (!p) notFound()
  const owed = round2(p.total_usd - p.amount_paid_usd)

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/purchases" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label={t("common.close")}>
          <ArrowLeft className="rtl:rotate-180" />
        </Link>
        <div className="ms-auto flex flex-wrap gap-2">
          <Link href={`/purchases/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
            <Pencil /> {t("common.edit")}
          </Link>
          <PurchaseActions id={id} sent={p.sent_to_inventory} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm md:p-8 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("purchases.number")}</div>
            <div className="font-mono text-2xl font-semibold">{docNumber(p.number)}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1">
              {p.sent_to_inventory && <Badge variant="secondary">{t("purchases.sentToInventory")}</Badge>}
              <Badge
                variant="outline"
                className={p.payment_status === "paid" ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"}
              >
                {t(p.payment_status === "paid" ? "purchases.payment_paid" : "purchases.payment_debt")}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{formatDate(p.date)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs tracking-wide text-muted-foreground uppercase">{t("purchases.supplier")}</div>
          <div className="font-medium">{p.supplier?.name ?? t("purchases.noSupplier")}</div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 text-start font-medium">{t("common.description")}</th>
              <th className="w-16 py-2 text-end font-medium">{t("common.qty")}</th>
              <th className="w-28 py-2 text-end font-medium">{t("purchases.unitCost")}</th>
              <th className="w-28 py-2 text-end font-medium">{t("common.total")}</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-end tabular-nums">{plain(item.qty, 3)}</td>
                <td className="py-2 text-end tabular-nums">{usd(item.unit_cost_usd)}</td>
                <td className="py-2 text-end tabular-nums">{usd(item.qty * item.unit_cost_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ms-auto mt-4 grid max-w-xs gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("invoices.grandTotal")}</span>
            <span className="font-semibold tabular-nums">{usd(p.total_usd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("common.paid")}</span>
            <span className="tabular-nums">{usd(p.amount_paid_usd)}</span>
          </div>
          {owed > 0 && (
            <div className="flex justify-between rounded-md bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-amber-800 dark:text-amber-400">
              <span>{t("purchases.owed")}</span>
              <span className="font-semibold tabular-nums">{usd(owed)}</span>
            </div>
          )}
        </div>

        {p.notes && <p className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{p.notes}</p>}
      </div>
    </div>
  )
}
