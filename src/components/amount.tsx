"use client"

import type { CurrencyMode } from "@/lib/data/types"
import { iqd, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useRate } from "./rate-provider"

/**
 * A USD amount in both currencies: USD, and IQD small underneath (or after it, `inline`). An invoice passes its
 * own rate and mode: a USD-only invoice shows only USD and an IQD-only one only IQD; everything else uses today's rate.
 */
export function Amount({ usd: n, rate, mode = "usd_iqd", inline, className }: { usd: number; rate?: number | null; mode?: CurrencyMode; inline?: boolean; className?: string }) {
  const today = useRate()
  const r = rate || today
  const inIqd = r ? iqd(usdToIqd(n, r)) : null
  const [main, other] = mode === "iqd" && inIqd ? [inIqd, null] : mode === "usd" ? [usd(n), null] : [usd(n), inIqd]
  return (
    <span className={cn(inline ? "inline-flex flex-wrap items-baseline gap-x-1.5" : "inline-flex flex-col items-end", "tabular-nums", className)}>
      <bdi dir="ltr">{main}</bdi>
      {other && <bdi dir="ltr" className="text-[0.8em] font-normal text-muted-foreground">{other}</bdi>}
    </span>
  )
}
