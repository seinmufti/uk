"use client"

import type { CurrencyMode } from "@/lib/data/types"
import { iqd, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useRate } from "./rate-provider"

/**
 * A USD amount, shown only in the currency it was written in: a record typed in IQD (a salary, an
 * expense…) passes currency "iqd" and its own rate, so it shows exactly as typed. An IQD-only invoice
 * passes mode "iqd". The other currency is seen only while typing (MoneyInput).
 */
export function Amount({
  usd: n,
  rate,
  mode = "usd_iqd",
  currency = "usd",
  className,
}: {
  usd: number
  rate?: number | null
  mode?: CurrencyMode
  currency?: "usd" | "iqd"
  /** Kept for callers; one line either way */
  inline?: boolean
  className?: string
}) {
  const today = useRate()
  const r = rate || today
  const inIqd = (mode === "iqd" || (mode !== "usd" && currency === "iqd")) && r
  return (
    <bdi dir="ltr" className={cn("tabular-nums", className)}>
      {inIqd ? iqd(usdToIqd(n, r)) : usd(n)}
    </bdi>
  )
}
