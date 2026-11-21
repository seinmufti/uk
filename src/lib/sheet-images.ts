"use client"

import { toCanvas } from "html-to-image"

// An A4 page at screen size (210 × 297 mm at 96 dpi) and the 12mm margin the sheet uses
const PAGE_W = 794
const PAGE_H = 1123
const MARGIN = Math.round((12 / 25.4) * 96) // 45px
/** ≈ 300 dpi: a 2480 × 3508 px picture per A4 page */
const SCALE = 3.125

/**
 * Turns a rendered invoice sheet (794px wide, 12mm padding) into one A4 PNG per page. Pages break before
 * any block marked data-keep that would not fit (a line, the summary, the signatures), never through it.
 */
export async function sheetToPages(sheet: HTMLElement): Promise<Blob[]> {
  // Wait for fonts and pictures so they are in the image
  await document.fonts.ready
  // (each picture gets up to 5 seconds, so a missing one can't hold everything up)
  await Promise.all(
    [...sheet.querySelectorAll("img")].map((img) =>
      img.complete ? null : new Promise((r) => (img.addEventListener("load", r, { once: true }), img.addEventListener("error", r, { once: true }), setTimeout(r, 5000))),
    ),
  )

  const full = await toCanvas(sheet, { pixelRatio: SCALE, backgroundColor: "#ffffff", cacheBust: true })
  const height = sheet.scrollHeight
  const top = sheet.getBoundingClientRect().top
  // A block's full height, including anything sticking out of it (like the Notes label above its box)
  const blocks = [...sheet.querySelectorAll<HTMLElement>("[data-keep]")].map((el) => {
    const rects = [el, ...el.querySelectorAll("*")].map((x) => x.getBoundingClientRect())
    return { top: Math.min(...rects.map((r) => r.top)) - top, bottom: Math.max(...rects.map((r) => r.bottom)) - top }
  })

  // Where each page's content starts and ends (in sheet pixels)
  const room = PAGE_H - 2 * MARGIN
  const cuts: { from: number; to: number }[] = []
  let from = MARGIN
  const end = Math.max(MARGIN, height - MARGIN)
  while (from < end - 1) {
    let to = Math.min(from + room, end)
    if (to < end) {
      // A block that would be cut: start the next page at its top instead (if it isn't the page's first thing)
      const cut = blocks.find((b) => b.top < to && b.bottom > to && b.top > from + 1)
      if (cut) to = cut.top
    }
    cuts.push({ from, to })
    from = to
  }

  const pages: Blob[] = []
  for (const { from, to } of cuts) {
    const page = document.createElement("canvas")
    page.width = Math.round(PAGE_W * SCALE)
    page.height = Math.round(PAGE_H * SCALE)
    const ctx = page.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, page.width, page.height)
    const h = (to - from) * SCALE
    ctx.drawImage(full, 0, from * SCALE, full.width, h, 0, MARGIN * SCALE, page.width, h)
    pages.push(await new Promise<Blob>((resolve) => page.toBlob((b) => resolve(b!), "image/png")))
  }
  return pages
}

/** A phone number as WhatsApp wants it: digits with the country code (Iraqi 07xx… → 9647xx…). */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let d = phone.replace(/[^\d+]/g, "")
  if (d.startsWith("+")) d = d.slice(1)
  else if (d.startsWith("00")) d = d.slice(2)
  else if (d.startsWith("0")) d = `964${d.slice(1)}`
  return d.length >= 8 ? d : null
}
