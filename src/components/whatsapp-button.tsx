"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { sheetToPages, whatsappNumber } from "@/lib/sheet-images"

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.53 14.94L2 22l5.2-1.47A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.24.68-1.42 1.3-1.95 1.34-.5.05-.98.23-3.3-.69-2.8-1.1-4.56-3.95-4.7-4.13-.13-.18-1.12-1.49-1.12-2.84 0-1.36.71-2.02.97-2.3.25-.27.55-.34.73-.34h.53c.17 0 .4-.06.62.48.24.56.8 1.93.87 2.07.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.69-.8.87-1.08.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.46.2.52.32.07.11.07.66-.17 1.34Z" />
    </svg>
  )
}

/**
 * Sends an invoice on WhatsApp as pictures, one high-quality PNG per A4 page; nothing is downloaded. On a
 * computer page 1 is copied and the customer's WhatsApp chat opens: Ctrl+V, then "Copy page 2" for the next
 * one, and so on. On a phone the share sheet opens with every page attached.
 */
export function WhatsAppButton({ sheet, phone, name }: { sheet: React.ReactNode; phone: string | null; name: string }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const holder = useRef<HTMLDivElement>(null)
  const done = useRef<((pages: Blob[]) => void) | null>(null)
  const failed = useRef<((e: unknown) => void) | null>(null)

  // Once the sheet is on the page (off screen), turn it into pictures
  useEffect(() => {
    if (!busy || !holder.current) return
    const el = holder.current.firstElementChild as HTMLElement | null
    if (!el) return
    sheetToPages(el).then((pages) => done.current?.(pages), (e) => failed.current?.(e))
  }, [busy])

  const send = () => {
    const pagesPromise = new Promise<Blob[]>((resolve, reject) => {
      done.current = resolve
      failed.current = reject
    })
    const number = whatsappNumber(phone)
    const chatUrl = number ? `https://wa.me/${number}` : "https://web.whatsapp.com/"
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    setBusy(true)

    // Phones: the share sheet, with the pictures attached (pick WhatsApp and the contact)
    if (mobile) {
      pagesPromise
        .then(async (pages) => {
          const files = pages.map((b, i) => new File([b], pages.length > 1 ? `${name}-${i + 1}.png` : `${name}.png`, { type: "image/png" }))
          if (navigator.canShare?.({ files })) await navigator.share({ files }).catch(() => {})
          else window.location.href = chatUrl
        })
        .catch(() => toast.error(t("whatsapp.failed")))
        .finally(() => setBusy(false))
      return
    }

    // Computers: the invoice goes on the clipboard (started now, while the click still counts), then the
    // customer's chat opens, ready for Ctrl+V and send. Nothing is downloaded.
    const openChat = () => {
      // (with "noopener" the browser reports every tab as blocked, so the link is cut off by hand)
      const tab = window.open(chatUrl, "_blank")
      // Blocked because it took a while: a button in the message opens it instead
      if (!tab) return false
      tab.opener = null
      return true
    }
    // The clipboard holds one picture at a time: page 1 now, then a button copies each next page
    // (a click each time, which the browser needs before it lets the clipboard be written)
    const copyNext = (pages: Blob[], i: number) =>
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": pages[i] })])
        .then(() => announce(pages, i))
        .catch(() => toast.error(t("whatsapp.failed")))
    const announce = (pages: Blob[], i: number) => {
      const next = i + 1 < pages.length ? { label: t("whatsapp.copyPage", { page: i + 2, count: pages.length }), onClick: () => void copyNext(pages, i + 1) } : undefined
      const message = pages.length === 1 ? t("whatsapp.copied") : t(next ? "whatsapp.copiedPage" : "whatsapp.copiedLast", { page: i + 1, count: pages.length })
      toast.success(message, { action: next, duration: next ? 120_000 : 8_000 })
    }
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": pagesPromise.then((pages) => pages[0]) })])
      .then(async () => {
        const pages = await pagesPromise
        announce(pages, 0)
        if (!openChat()) toast(t("whatsapp.openChat"), { action: { label: t("whatsapp.openChat"), onClick: openChat }, duration: 20_000 })
      })
      .catch(() => toast.error(t("whatsapp.failed")))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <Button variant="outline" onClick={send} disabled={busy} className="text-emerald-700 dark:text-emerald-400">
        <WhatsAppIcon /> {busy ? t("whatsapp.making") : "WhatsApp"}
      </Button>
      {/* The sheet at A4 width, off screen, only while the pictures are made */}
      {busy &&
        createPortal(
          <div ref={holder} aria-hidden="true" className="pointer-events-none fixed top-0 -left-[10000px] w-[794px] print:hidden">
            {sheet}
          </div>,
          document.body,
        )}
    </>
  )
}
