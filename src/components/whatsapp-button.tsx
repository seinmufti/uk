"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { sheetToPages, stackPages, whatsappNumber } from "@/lib/sheet-images"

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.53 14.94L2 22l5.2-1.47A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.24.68-1.42 1.3-1.95 1.34-.5.05-.98.23-3.3-.69-2.8-1.1-4.56-3.95-4.7-4.13-.13-.18-1.12-1.49-1.12-2.84 0-1.36.71-2.02.97-2.3.25-.27.55-.34.73-.34h.53c.17 0 .4-.06.62.48.24.56.8 1.93.87 2.07.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.18.69-.8.87-1.08.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.46.2.52.32.07.11.07.66-.17 1.34Z" />
    </svg>
  )
}

const download = (blob: Blob, name: string) => {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

/**
 * Sends an invoice on WhatsApp as pictures: every A4 page becomes a high-quality PNG, saved and copied to
 * the clipboard. On a phone the share sheet opens (pick WhatsApp, the pictures are attached); on a computer
 * the customer's WhatsApp chat opens, ready to paste the picture and press send.
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
    // Started while the click still counts, so the browser allows the clipboard and the new tab
    const number = whatsappNumber(phone)
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    const chat = mobile ? null : window.open("about:blank", "_blank")
    const copied = navigator.clipboard?.write?.([new ClipboardItem({ "image/png": pagesPromise.then(stackPages) })]).then(
      () => true,
      () => false,
    )
    setBusy(true)
    pagesPromise
      .then(async (pages) => {
        const files = pages.map((b, i) => new File([b], pages.length > 1 ? `${name}-${i + 1}.png` : `${name}.png`, { type: "image/png" }))
        if (mobile && navigator.canShare?.({ files })) {
          await navigator.share({ files }).catch(() => {})
          return
        }
        for (const f of files) download(f, f.name)
        const ok = await copied
        if (chat) chat.location.href = number ? `https://wa.me/${number}` : "https://web.whatsapp.com/"
        toast.success(t(ok ? "whatsapp.ready" : "whatsapp.saved", { count: pages.length }))
      })
      .catch(() => {
        chat?.close()
        toast.error(t("whatsapp.failed"))
      })
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
