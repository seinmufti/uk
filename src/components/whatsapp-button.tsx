"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { sheetToPages, whatsappNumber } from "@/lib/sheet-images"

const noop = () => () => {}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.53 14.94L2 22l5.2-1.47A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.24.68-1.42 1.3-1.95 1.34-.5.05-.98.23-3.3-.69-2.8-1.1-4.56-3.95-4.7-4.13-.13-.18-1.12-1.49-1.12-2.84 0-1.36.71-2.02.97-2.3.25-.27.55-.34.73-.34h.53c.17 0 .4-.06.62.48.24.56.8 1.93.87 2.07.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.69-.8.87-1.08.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.46.2.52.32.07.11.07.66-.17 1.34Z" />
    </svg>
  )
}

/**
 * Sends an invoice on WhatsApp as pictures, one high-quality PNG per A4 page; nothing is downloaded.
 * The pictures are made in the background as soon as the invoice opens, so the click acts at once:
 *  - one page: it's copied and the customer's WhatsApp chat opens (Ctrl+V, then send);
 *  - several pages: the system's Share window opens with every page attached as its own picture
 *    (pick WhatsApp and the customer). Without a Share window, pages are copied one by one.
 * `name` also identifies the sheet: when it changes (e.g. Payment ↔ Quotation) the pictures are made again.
 */
export function WhatsAppButton({ sheet, phone, name }: { sheet: React.ReactNode; phone: string | null; name: string }) {
  const { t } = useI18n()
  // The sheet whose pictures are being made (null once they're ready)
  const [making, setMaking] = useState<string | null>(name)
  const [waiting, setWaiting] = useState(false)
  // Only in the browser (the off-screen sheet is never part of the server's page)
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const holder = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState<{ name: string; pages: Blob[] } | null>(null)
  const pending = useRef<((pages: Blob[]) => void) | null>(null)

  // A different sheet (Payment ↔ Quotation): make its pictures
  if (making !== name && ready?.name !== name) setMaking(name)

  // Make the pictures off screen
  useEffect(() => {
    if (!making) return
    let cancelled = false
    const timer = setTimeout(() => {
      const el = holder.current?.firstElementChild as HTMLElement | null
      if (!el) return
      sheetToPages(el)
        .then((pages) => {
          if (cancelled) return
          setReady({ name: making, pages })
          pending.current?.(pages)
          pending.current = null
        })
        .catch(() => !cancelled && toast.error(t("whatsapp.failed")))
        .finally(() => !cancelled && setMaking(null))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [making, t])

  const number = whatsappNumber(phone)
  const chatUrl = number ? `https://wa.me/${number}` : "https://web.whatsapp.com/"
  const openChat = () => {
    const tab = window.open(chatUrl, "_blank")
    if (tab) tab.opener = null
    return !!tab
  }
  const files = (pages: Blob[]) => pages.map((b, i) => new File([b], pages.length > 1 ? `${name}-${i + 1}.png` : `${name}.png`, { type: "image/png" }))

  // One picture at a time on the clipboard; each next page on a click (the browser wants one per copy)
  const copyPage = (pages: Blob[], i: number): Promise<void> =>
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": pages[i] })])
      .then(() => {
        const next = i + 1 < pages.length ? { label: t("whatsapp.copyPage", { page: i + 2, count: pages.length }), onClick: () => void copyPage(pages, i + 1) } : undefined
        const message = pages.length === 1 ? t("whatsapp.copied") : t(next ? "whatsapp.copiedPage" : "whatsapp.copiedLast", { page: i + 1, count: pages.length })
        toast.success(message, { action: next, duration: next ? 120_000 : 8_000 })
      })
      .catch(() => {
        toast.error(t("whatsapp.failed"))
      })

  const shareAll = (pages: Blob[]): Promise<void> =>
    navigator
      .share({ files: files(pages) })
      .then(() => {
        toast.success(t("whatsapp.shared", { count: pages.length }))
      })
      .catch((e: unknown) => {
        // Closed without sharing: nothing to say. Took too long for the browser: a button starts it again
        if (e instanceof DOMException && e.name === "AbortError") return
        toast(t("whatsapp.shareReady", { count: pages.length }), { action: { label: t("whatsapp.share"), onClick: () => void shareAll(pages) }, duration: 60_000 })
      })

  const send = (pages: Blob[]) => {
    if (pages.length > 1 && navigator.canShare?.({ files: files(pages) })) return void shareAll(pages)
    void copyPage(pages, 0).then(() => {
      if (!openChat()) toast(t("whatsapp.openChat"), { action: { label: t("whatsapp.openChat"), onClick: openChat }, duration: 20_000 })
    })
  }

  const click = () => {
    const done = ready?.name === name ? ready.pages : null
    if (done) return send(done)
    // Still being made: finish, then go on (a button takes over if the browser no longer allows it)
    setWaiting(true)
    pending.current = (pages) => {
      setWaiting(false)
      send(pages)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={click} disabled={waiting} className="text-emerald-700 dark:text-emerald-400">
        <WhatsAppIcon /> {waiting ? t("whatsapp.making") : "WhatsApp"}
      </Button>
      {/* The sheet at A4 width, off screen, only while its pictures are made */}
      {making === name &&
        mounted &&
        createPortal(
          <div ref={holder} aria-hidden="true" className="pointer-events-none fixed top-0 -left-[10000px] w-[794px] print:hidden">
            {sheet}
          </div>,
          document.body,
        )}
    </>
  )
}
