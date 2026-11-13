"use client"

import { Printer, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
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

const ZOOMS = [1, 1.5, 2, 3]

/**
 * Shows a full A4 page scaled to fit the space it's given. The zoom buttons (or ctrl + mouse wheel)
 * make it bigger; then the page scrolls inside the preview.
 */
function FitPage({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0)
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setFit(Math.min((el.clientWidth - 32) / PAGE_W, (el.clientHeight - 32) / PAGE_H))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const step = (dir: 1 | -1) => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + dir))] ?? 1)
  // ctrl + wheel zooms the page, not the whole app (a native listener, so the browser zoom can be stopped)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + (e.deltaY < 0 ? 1 : -1)))] ?? 1)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])
  const scale = fit * zoom

  return (
    <div ref={box} className="relative min-h-0 flex-1 bg-muted/50">
      <div
        className={cn("absolute inset-0 grid overflow-auto p-4", zoom === 1 && "cursor-zoom-in")}
        onClick={() => zoom === 1 && setZoom(2)}
        ref={scroller}
      >
        <div style={{ width: PAGE_W * scale, height: PAGE_H * scale }} className="m-auto shrink-0">
          <div
            style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}
            className="overflow-hidden rounded-sm bg-white shadow-lg"
          >
            {children}
          </div>
        </div>
      </div>
      <div dir="ltr" className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-card p-1 shadow-md">
        <Button variant="ghost" size="icon-sm" aria-label={t("printPage.zoomOut")} disabled={zoom === ZOOMS[0]} onClick={() => step(-1)}>
          <ZoomOut />
        </Button>
        <button type="button" className="min-w-14 rounded-full px-2 text-sm font-medium tabular-nums hover:bg-muted" onClick={() => setZoom(1)} title={t("printPage.fit")}>
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon-sm" aria-label={t("printPage.zoomIn")} disabled={zoom === ZOOMS[ZOOMS.length - 1]} onClick={() => step(1)}>
          <ZoomIn />
        </Button>
      </div>
    </div>
  )
}
