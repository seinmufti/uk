"use client"

import { useState } from "react"
import type { Locale } from "@/i18n/locales"
import { useI18n } from "@/i18n/provider"
import { cn } from "@/lib/utils"
import type { SheetVariant } from "./invoice-sheet"
import { PrintDialog } from "./print-dialog"
import { WhatsAppButton } from "./whatsapp-button"

/**
 * Customer invoices: a Payment / Quotation switch (Payment by default) beside Print and WhatsApp. A quotation
 * gets the signature lines; a payment invoice doesn't. The sheets come rendered from the server, one per
 * variant and language.
 */
export function InvoiceExport({
  sheets,
  phone,
  name,
}: {
  sheets: Record<SheetVariant, Record<Locale, React.ReactNode>>
  phone: string | null
  name: string
}) {
  const { t, locale } = useI18n()
  const [variant, setVariant] = useState<SheetVariant>("payment")
  return (
    <>
      <div role="radiogroup" aria-label={t("sheet.quotation")} className="inline-flex rounded-lg border bg-card p-[3px] text-sm">
        {(["payment", "quotation"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={variant === v}
            onClick={() => setVariant(v)}
            className={cn("rounded-md px-3 py-1 font-medium whitespace-nowrap", variant === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t(v === "payment" ? "sheet.payment" : "sheet.quotation")}
          </button>
        ))}
      </div>
      <PrintDialog sheets={sheets[variant]} />
      <WhatsAppButton sheet={sheets[variant][locale]} phone={phone} name={variant === "quotation" ? name.replace("invoice", "quotation") : name} />
    </>
  )
}
