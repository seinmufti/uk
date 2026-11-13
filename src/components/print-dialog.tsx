"use client"

import { Printer } from "lucide-react"
import { useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/locales"
import { useI18n } from "@/i18n/provider"
import { cn } from "@/lib/utils"

/**
 * Print / PDF preview in a modal: the invoice in each language is rendered on the server and passed in,
 * and the toggle picks which one shows (the app's language first). While the modal is open, a copy of the
 * shown sheet sits at the end of <body>, and printing shows only that copy (see .print-root in globals.css).
 */
export function PrintDialog({ sheets }: { sheets: Record<Locale, React.ReactNode> }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<Locale>(locale)

  return (
    <>
      <Button variant="outline" onClick={() => (setLang(locale), setOpen(true))}>
        <Printer /> {t("common.print")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 border-b p-3 pe-12">
            <DialogTitle className="sr-only">{t("printPage.title")}</DialogTitle>
            <span className="text-sm text-muted-foreground">{t("printPage.language")}</span>
            <div role="radiogroup" aria-label={t("printPage.language")} className="inline-flex rounded-lg border bg-card p-[3px] text-sm shadow-xs">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={lang === l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium whitespace-nowrap transition-colors",
                    lang === l ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {LOCALE_NAMES[l]}
                </button>
              ))}
            </div>
            <Button onClick={() => window.print()} className="ms-auto">
              <Printer /> {t("printPage.print")}
            </Button>
            <p className="w-full text-xs text-muted-foreground">{t("printPage.hint")}</p>
          </div>
          {/* The page preview, scrolling inside the modal */}
          <div className="min-h-0 flex-1 overflow-auto bg-muted/50 p-4 sm:p-6">
            <div className="mx-auto max-w-[210mm] rounded-md shadow-md">{sheets[lang]}</div>
          </div>
        </DialogContent>
      </Dialog>
      {open && createPortal(<div className="print-root hidden print:block">{sheets[lang]}</div>, document.body)}
    </>
  )
}
