"use client"

import { Search } from "lucide-react"
import { HoverLink } from "./hover-link"
import { useRouter, useSelectedLayoutSegment } from "next/navigation"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/i18n/provider"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export type DocListItem = {
  id: string
  title: string
  subtitle: string
  date: string
  amount: string
  badge?: { label: string; tone: "good" | "warn" | "muted" }
}

const TONES = {
  good: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
  warn: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  muted: "",
}

type Kind = NonNullable<Parameters<ReturnType<typeof useRouter>["prefetch"]>[1]>["kind"]
const FULL = "full" as Kind
const PRELOAD = 50

/** The searchable list of invoices / purchases on the start side. */
export function DocList({ items, basePath, empty }: { items: DocListItem[]; basePath: string; empty: string }) {
  const { t, locale } = useI18n()
  const [query, setQuery] = useState("")
  const selected = useSelectedLayoutSegment()
  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => `${i.title} ${i.subtitle} ${i.amount}`.toLowerCase().includes(q)) : items

  // Load the newest documents (with their data) as soon as the list shows, so opening one is instant.
  // Older ones still load on hover.
  const router = useRouter()
  const preload = items.slice(0, PRELOAD).map((i) => `${basePath}/${i.id}`).join(" ")
  useEffect(() => {
    if (!preload) return
    const timer = setTimeout(() => {
      for (const href of preload.split(" ")) router.prefetch(href, { kind: FULL })
    }, 300)
    return () => clearTimeout(timer)
  }, [preload, router])

  return (
    <>
      <div className="border-b p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("common.search")} className="ps-8" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {shown.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{items.length ? t("common.noData") : empty}</p>}
        {shown.map((item) => (
          <HoverLink
            key={item.id}
            href={`${basePath}/${item.id}`}
            className={cn("block border-b px-3 py-2.5 transition-colors hover:bg-muted/60", selected === item.id && "bg-accent shadow-[inset_3px_0_0_var(--primary)]")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium tabular-nums">{item.title}</span>
              <span className="text-sm font-medium tabular-nums">{item.amount}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{item.subtitle}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {item.badge && (
                  <Badge variant="outline" className={cn("h-4 px-1.5 text-[10px]", TONES[item.badge.tone])}>
                    {item.badge.label}
                  </Badge>
                )}
                {formatDate(item.date, locale)}
              </span>
            </div>
          </HoverLink>
        ))}
      </div>
    </>
  )
}
