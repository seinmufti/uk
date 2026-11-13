"use client"

import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/locales"
import { useI18n } from "@/i18n/provider"
import { cn } from "@/lib/utils"

/** Above the printed invoice (not printed itself): back, the invoice's language, and Print / Save as PDF. */
export function PrintToolbar({ id, lang }: { id: string; lang: Locale }) {
  const { t } = useI18n()
  return (
    <div className="sticky top-0 z-10 mb-6 border-b bg-card/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 py-3">
        <Link href={`/invoices/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="rtl:rotate-180" /> {t("printPage.back")}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("printPage.language")}</span>
          <div role="radiogroup" aria-label={t("printPage.language")} className="inline-flex rounded-lg border bg-card p-[3px] text-sm shadow-xs">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={`/print/invoice/${id}?lang=${l}`}
                replace
                scroll={false}
                role="radio"
                aria-checked={lang === l}
                className={cn(
                  "rounded-md px-3 py-1 font-medium whitespace-nowrap transition-colors",
                  lang === l ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {LOCALE_NAMES[l]}
              </Link>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => window.print()} className={cn(buttonVariants(), "ms-auto")}>
          <Printer /> {t("printPage.print")}
        </button>
        <p className="w-full text-xs text-muted-foreground">{t("printPage.hint")}</p>
      </div>
    </div>
  )
}
