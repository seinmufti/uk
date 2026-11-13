"use client"

import { useI18n } from "@/i18n/provider"
import { CURRENCY_MODES, type CurrencyMode } from "@/lib/data/types"
import { cn } from "@/lib/utils"

/** USD · USD → IQD · IQD: how an invoice shows its money. */
export function CurrencyToggle({ value, onChange }: { value: CurrencyMode; onChange: (mode: CurrencyMode) => void }) {
  const { t } = useI18n()
  return (
    <div role="radiogroup" aria-label={t("invoices.currency")} className="inline-flex rounded-lg bg-muted p-[3px] text-sm">
      {CURRENCY_MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          className={cn(
            "rounded-md px-3 py-1 font-medium whitespace-nowrap transition-colors",
            value === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`invoices.mode.${m}`)}
        </button>
      ))}
    </div>
  )
}
