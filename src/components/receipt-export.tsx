"use client"

import type { Locale } from "@/i18n/locales"
import { useI18n } from "@/i18n/provider"
import { PrintDialog } from "./print-dialog"
import { WhatsAppButton } from "./whatsapp-button"

/** A receipt's Print and WhatsApp buttons, like an invoice's (the sheets come rendered from the server, one per language). */
export function ReceiptExport({ sheets, phone, name }: { sheets: Record<Locale, React.ReactNode>; phone: string | null; name: string }) {
  const { locale } = useI18n()
  return (
    <>
      <PrintDialog sheets={sheets} />
      <WhatsAppButton sheet={sheets[locale]} phone={phone} name={name} />
    </>
  )
}
