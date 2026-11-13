"use client"

import { useLayoutEffect, useRef } from "react"
import { Input } from "@/components/ui/input"

/** 1234567.5 → "1,234,567.5" (keeps what's being typed: a trailing dot, trailing zeros, a leading minus). */
export function withCommas(raw: string) {
  const m = /^(-?)(\d*)(\.\d*)?$/.exec(raw)
  if (!m) return raw
  return m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (m[3] ?? "")
}

type Props = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string | number
  onChange?: (e: { target: { value: string } }) => void
}

/**
 * A number field that shows thousands separators (169,450) while typing. The value going in and out is
 * the plain number text ("169450"), so callers treat it like a normal number input.
 */
export function NumberInput({ value, onChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null) // digits before the caret, to put it back after formatting
  const shown = withCommas(String(value ?? ""))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || caret.current === null || document.activeElement !== el) return
    let digits = caret.current
    let pos = 0
    while (pos < shown.length && digits > 0) {
      if (shown[pos] !== ",") digits--
      pos++
    }
    el.setSelectionRange(pos, pos)
    caret.current = null
  }, [shown])

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onChange={(e) => {
        const el = e.target
        const raw = el.value.replace(/[^\d.-]/g, "")
        if (!/^-?\d*\.?\d*$/.test(raw)) return
        caret.current = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/,/g, "").length
        onChange?.({ target: { value: raw } })
      }}
    />
  )
}
