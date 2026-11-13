import { notFound, redirect } from "next/navigation"
import { InvoiceDocument } from "@/components/invoice-document"
import { PrintToolbar } from "@/components/print-toolbar"
import { dirFor, isLocale } from "@/i18n/locales"
import { getLocale } from "@/i18n/server"
import { translator } from "@/i18n/translate"
import { getSession } from "@/lib/auth"
import { getInvoice } from "@/lib/data/invoices"
import { cn } from "@/lib/utils"

/**
 * An invoice laid out as a page, for printing or saving as PDF. It's written in the app's language
 * unless another is picked in the toolbar (?lang=en|ar|ckb); the toolbar itself isn't printed.
 */
export default async function PrintInvoicePage({ params, searchParams }: PageProps<"/print/invoice/[id]">) {
  if (!(await getSession())) redirect("/login")
  const [{ id }, query, appLocale] = await Promise.all([params, searchParams, getLocale()])
  const lang = typeof query.lang === "string" && isLocale(query.lang) ? query.lang : appLocale
  const invoice = await getInvoice(id)
  if (!invoice) notFound()
  const dir = dirFor(lang)

  return (
    <div className="min-h-dvh bg-muted/40 print:bg-white">
      <PrintToolbar id={id} lang={lang} />
      <div className="mx-auto max-w-[210mm] px-4 pb-10 print:max-w-none print:p-0">
        {/* The printed sheet: always light, in the chosen language and direction */}
        <div
          lang={lang}
          dir={dir}
          className={cn("paper rounded-lg bg-white p-8 text-neutral-900 shadow-md print:rounded-none print:p-0 print:shadow-none", dir === "rtl" && "font-[family-name:var(--font-arabic)]")}
          style={{ colorScheme: "light" }}
        >
          <InvoiceDocument invoice={invoice} t={translator(lang)} locale={lang} className="border-0 bg-white p-0 shadow-none md:p-0" />
        </div>
      </div>
    </div>
  )
}
