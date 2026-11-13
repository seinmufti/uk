"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useTransition } from "react"
import { documentPages } from "@/lib/actions/preload"
import { featureOf, isEnabled } from "@/lib/features"

const SECTIONS = ["/", "/invoices", "/receipts", "/purchases", "/expenses", "/debts", "/reports", "/customers", "/suppliers", "/inventory", "/hr", "/hr/payroll", "/history"]
/** A page shown from the browser's copy is checked against the server once that copy is this old
 * (saves made in the app reload the copies straight away, so this only catches changes from elsewhere). */
const FRESH_MS = 30_000
/** Wait this long on a page before checking it, so the check never holds up a quick next click. */
const SETTLE_MS = 1500

type Router = ReturnType<typeof useRouter>
type Kind = NonNullable<Parameters<Router["prefetch"]>[1]>["kind"]
const FULL = "full" as Kind

/**
 * Loads every section (with its data) when the app opens. After that a page opens at once from
 * what was loaded, then quietly asks the server for the latest data and swaps it in if anything
 * changed. Also checks again when you come back to the tab.
 */
export function LiveData() {
  const router = useRouter()
  const pathname = usePathname()
  const loadedAt = useRef(new Map<string, number>())
  const last = useRef<string | null>(null)
  const preloaded = useRef(false)
  const [, startTransition] = useTransition()

  // Keep a full copy of a page in the browser; load it again whenever a save makes it stale
  const keep = useCallback(
    function keepPage(href: string) {
      loadedAt.current.set(href, Date.now())
      router.prefetch(href, { kind: FULL, onInvalidate: () => keepPage(href) })
    },
    [router],
  )

  // Load all sections up front (once)
  useEffect(() => {
    if (preloaded.current) return
    preloaded.current = true
    for (const href of SECTIONS) {
      const f = featureOf(href)
      if (!f || isEnabled(f)) keep(href)
    }
    // Then every invoice, purchase and receipt, so opening any of them is instant
    documentPages()
      .then((pages) => pages.forEach((href) => keep(href)))
      .catch(() => {})
  }, [keep])

  // On each page change: show the copy we have, then check for newer data.
  // Keep a fresh copy of the page we just left, so going back is instant too.
  useEffect(() => {
    const prev = last.current
    last.current = pathname
    if (prev && prev !== pathname) keep(prev)
    const at = loadedAt.current.get(pathname)
    loadedAt.current.set(pathname, Date.now())
    if (at === undefined || Date.now() - at <= FRESH_MS) return
    const timer = setTimeout(() => startTransition(() => router.refresh()), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [pathname, router, keep])

  // Back in the tab after a while: check the page you're on
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - (loadedAt.current.get(pathname) ?? 0) > FRESH_MS) {
        loadedAt.current.set(pathname, Date.now())
        startTransition(() => router.refresh())
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [pathname, router])

  return null
}
