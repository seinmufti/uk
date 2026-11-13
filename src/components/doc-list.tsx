"use client"

import { Search } from "lucide-react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { useState } from "react"
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
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  muted: "",
}

/** The searchable list of invoices / purchases on the start side. */
export function DocList({ items, basePath, empty }: { items: DocListItem[]; basePath: string; empty: string }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const selected = useSelectedLayoutSegment()
  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => `${i.title} ${i.subtitle} ${i.amount}`.toLowerCase().includes(q)) : items

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
          <Link
            key={item.id}
            href={`${basePath}/${item.id}`}
            className={cn("block border-b px-3 py-2.5 transition-colors hover:bg-muted/60", selected === item.id && "bg-muted")}
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
                {formatDate(item.date)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
