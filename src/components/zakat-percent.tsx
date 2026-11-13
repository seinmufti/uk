"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/i18n/provider"
import { saveZakatPercent } from "@/lib/actions/records"
import { num } from "@/lib/money"
import { useAction } from "./use-action"

/** The zakat rate (2% by default), saved when the field loses focus. */
export function ZakatPercent({ value }: { value: number }) {
  const { t } = useI18n()
  const { run } = useAction()
  const [text, setText] = useState(String(value))
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {t("settings.zakatPercent")}
      <Input
        type="number"
        step="0.01"
        min="0"
        max="100"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => num(text) !== value && run(() => saveZakatPercent(num(text)), { success: t("common.saved") })}
        className="h-7 w-16 text-end"
      />
    </label>
  )
}
