"use client"

import { NumberInput } from "./number-input"

/** An entry's exchange rate, on one line: $100 = [ 150,000 ] IQD. */
export function RateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground" dir="ltr">
      <span className="shrink-0">$100 =</span>
      <NumberInput value={value} onChange={(e) => onChange(e.target.value)} step="any" min="0" required aria-label="IQD per $100" className="h-7 min-w-0 flex-1 text-end text-xs tabular-nums" />
      <span className="shrink-0">IQD</span>
    </label>
  )
}
