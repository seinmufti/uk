import { ArrowLeft, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocPayments } from "@/components/doc-payments"
import { InvoiceActions } from "@/components/invoice-actions"
import { InvoiceDocument, InvoicePaper } from "@/components/invoice-document"
import { PrintDialog } from "@/components/print-dialog"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { docNumber } from "@/lib/money"
import { buttonVariants } from "@/components/ui/button"
import { getLocale, getT } from "@/i18n/server"
import { getInvoice } from "@/lib/data/invoices"
import { receiptsFor } from "@/lib/data/receipts"
import { cn } from "@/lib/utils"

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params
  const [t, locale, invoice, receipts] = await Promise.all([getT(), getLocale(), getInvoice(id), receiptsFor({ invoiceId: id })])
  if (!invoice) notFound()

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
          <PrintDialog sheets={{ en: <InvoicePaper invoice={invoice} lang="en" />, ar: <InvoicePaper invoice={invoice} lang="ar" />, ckb: <InvoicePaper invoice={invoice} lang="ckb" /> }} />
          <WhatsAppButton sheet={<InvoicePaper invoice={invoice} lang={locale} />} phone={invoice.customer?.phone ?? null} name={`invoice-${docNumber(invoice.number)}`} />
        </div>
      </div>

      <InvoiceDocument invoice={invoice} t={t} locale={locale} />
      {/* Money received against this invoice; a new receipt opens already pointed at it */}
      <DocPayments receipts={receipts} mode={invoice.currency_mode} recordHref={invoice.status === "paid" ? null : `/receipts/new?kind=in&invoice=${id}`} />
    </div>
  )
}
