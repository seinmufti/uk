"use client"

import { useState } from "react"
import { iqd, iqdToUsd, num, round6, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { NumberInput } from "./number-input"
import { useRate } from "./rate-provider"

type Props = Omit<React.ComponentProps<typeof NumberInput>, "value" | "onChange"> & {
  /** The amount in USD (as text), like a normal number field */
  value: string | number
  /** Always gets the amount in USD (as text), whichever currency was typed */
  onChange?: (e: { target: { value: string } }) => void
  /** The rate to convert with (IQD per 100 USD); today's rate when left out. Pass the record's own rate when
   * changing a saved amount, so an IQD amount comes back exactly as typed. */
  rate?: number | null
  /** The currency it was typed in (the switch starts there); saved with the record so it shows the same way */
  currency?: Currency
  onCurrencyChange?: (currency: Currency) => void
}

export type Currency = "usd" | "iqd"

/**
 * A money field with a USD / IQD switch. Amounts are kept in USD, so the rest of the app doesn't change:
 * typing in IQD converts at the rate, and the other currency shows small underneath. The chosen currency
 * goes back to the form (onCurrencyChange), which saves it so the amount shows in that currency later.
 */
export function MoneyInput({ value, onChange, rate, currency = "usd", onCurrencyChange, className, ...props }: Props) {
  const today = useRate()
  const r = rate || today || 0
  const [cur, setCur] = useState<Currency>(currency)
  const toIqdText = (u: string) => (u === "" || !r ? "" : String(Math.round(usdToIqd(num(u), r))))
  // Kept to 6 decimals, so the IQD amount comes back exactly
  const toUsdText = (q: string) => (q === "" || !r ? "" : String(round6(iqdToUsd(num(q), r))))
  const usdText = (u: string) => (u === "" ? "" : String(Math.round(num(u) * 100) / 100))
  const incoming = String(value ?? "")
  const [text, setText] = useState(currency === "iqd" ? toIqdText(incoming) : usdText(incoming))
  // The last USD amount and the currency prop this field knows about; different ones from outside (a form
  // opened on another record) are shown afresh. The switch itself works even when the form doesn't track it.
  const [seen, setSeen] = useState(incoming)
  const [seenCurrency, setSeenCurrency] = useState(currency)
  if (incoming !== seen || currency !== seenCurrency) {
    setSeen(incoming)
    setSeenCurrency(currency)
    setCur(currency)
    setText(currency === "iqd" ? toIqdText(incoming) : usdText(incoming))
  }

  const type = (typed: string) => {
    setText(typed)
    const asUsd = cur === "usd" ? typed : toUsdText(typed)
    setSeen(asUsd)
    onChange?.({ target: { value: asUsd } })
  }
  const pick = (next: Currency) => {
    if (next === cur) return
    setText(next === "iqd" ? toIqdText(seen) : usdText(seen))
    setCur(next)
    onCurrencyChange?.(next)
  }
  const amount = num(seen)

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <NumberInput {...props} value={text} onChange={(e) => type(e.target.value)} placeholder={cur === "usd" ? "0.00" : "0"} className={cn("min-w-0 flex-1 text-end tabular-nums", className)} />
        <div role="radiogroup" aria-label="Currency" className="inline-flex shrink-0 rounded-lg border bg-card p-[2px] text-xs">
          {(["usd", "iqd"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cur === c}
              disabled={c === "iqd" && !r}
              onClick={() => pick(c)}
              className={cn("rounded-md px-2 py-1 font-medium disabled:opacity-40", cur === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {c === "usd" ? "USD" : "IQD"}
            </button>
          ))}
        </div>
      </div>
      {/* The same amount in the other currency */}
      {amount > 0 && r > 0 && <span className="text-end text-xs text-muted-foreground tabular-nums">{cur === "usd" ? iqd(usdToIqd(amount, r)) : usd(amount)}</span>}
    </div>
  )
}
