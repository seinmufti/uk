import { ArrowLeft, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocPayments } from "@/components/doc-payments"
import { InvoiceDocument, InvoicePaper } from "@/components/invoice-document"
import { PrintDialog } from "@/components/print-dialog"
import { PurchaseActions } from "@/components/purchase-actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { getLocale, getT } from "@/i18n/server"
import { getPurchase } from "@/lib/data/purchases"
import { purchaseDebtId, receiptsFor } from "@/lib/data/receipts"
import { cn } from "@/lib/utils"

/** A purchase invoice: the same page as a sales invoice, plus sending its items to inventory. */
export default async function PurchasePage({ params }: PageProps<"/purchases/[id]">) {
  const { id } = await params
  const [t, locale, p, receipts, debtId] = await Promise.all([getT(), getLocale(), getPurchase(id), receiptsFor({ purchaseId: id }), purchaseDebtId(id)])
  if (!p) notFound()

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/purchases" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label={t("common.close")}>
          <ArrowLeft className="rtl:rotate-180" />
        </Link>
        {p.sent_to_inventory && <Badge variant="secondary">{t("purchases.sentToInventory")}</Badge>}
        <div className="ms-auto flex flex-wrap gap-2">
          <Link href={`/purchases/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
            <Pencil /> {t("common.edit")}
          </Link>
          <PurchaseActions id={id} sent={p.sent_to_inventory} />
          <PrintDialog
            sheets={{
              en: <InvoicePaper invoice={p} lang="en" kind="purchase" />,
              ar: <InvoicePaper invoice={p} lang="ar" kind="purchase" />,
              ckb: <InvoicePaper invoice={p} lang="ckb" kind="purchase" />,
            }}
          />
        </div>
      </div>

      <InvoiceDocument invoice={p} t={t} locale={locale} kind="purchase" />
      {/* Money paid to the supplier against this purchase */}
      <DocPayments receipts={receipts} recordHref={debtId ? `/receipts/new?kind=out&debt=${debtId}` : null} />
    </div>
  )
}
