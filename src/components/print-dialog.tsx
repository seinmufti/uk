"use client"

import { Printer } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
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
          </div>
          {/* The whole A4 page, shrunk to fit the modal: no scrolling */}
          <FitPage>{sheets[lang]}</FitPage>
        </DialogContent>
      </Dialog>
      {open && createPortal(<div className="print-root hidden print:block">{sheets[lang]}</div>, document.body)}
    </>
  )
}

// An A4 page at screen size (210 × 297 mm at 96 dpi)
const PAGE_W = 794
const PAGE_H = 1123

/** Shows a full A4 page scaled down so all of it fits in the space it's given. */
function FitPage({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(Math.min((el.clientWidth - 32) / PAGE_W, (el.clientHeight - 32) / PAGE_H))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={box} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/50">
      <div style={{ width: PAGE_W * scale, height: PAGE_H * scale }} className="shrink-0">
        <div
          style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="overflow-hidden rounded-sm bg-white shadow-lg"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
