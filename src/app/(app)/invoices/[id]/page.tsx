import { ArrowLeft, Pencil, Printer } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { InvoiceActions } from "@/components/invoice-actions"
import { InvoiceDocument } from "@/components/invoice-document"
import { buttonVariants } from "@/components/ui/button"
import { getLocale, getT } from "@/i18n/server"
import { getInvoice } from "@/lib/data/invoices"
import { cn } from "@/lib/utils"

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params
  const [t, locale, invoice] = await Promise.all([getT(), getLocale(), getInvoice(id)])
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
          {/* Opens the print / PDF page, where the language of the printout can be changed */}
          <Link href={`/print/invoice/${id}`} prefetch className={buttonVariants({ variant: "outline" })}>
            <Printer /> {t("common.print")}
          </Link>
        </div>
      </div>

      <InvoiceDocument invoice={invoice} t={t} locale={locale} />
    </div>
  )
}
