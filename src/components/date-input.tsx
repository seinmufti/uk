"use client"

import { CalendarDays } from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  /** yyyy-mm-dd (or "") */
  value: string
  /** Gets yyyy-mm-dd, or "" when cleared */
  onChange: (e: { target: { value: string } }) => void
  required?: boolean
  disabled?: boolean
  min?: string
  autoFocus?: boolean
  className?: string
  "aria-label"?: string
}

const show = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "")

/** "25/11/2026" (or 25-11-2026, 25.11.2026, 2511026…) → "2026-11-25"; null if it isn't a real date */
function parse(text: string): string | null {
  const m = /^\s*(\d{1,2})\D?(\d{1,2})\D?(\d{4})\s*$/.exec(text)
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/**
 * A date field that always reads DD/MM/YYYY, whatever the browser's language (the browser's own date box
 * shows its locale's order). Type the date, or pick it from the calendar.
 */
export function DateInput({ value, onChange, required, disabled, min, autoFocus, className, ...aria }: Props) {
  const picker = useRef<HTMLInputElement>(null)
  // What's being typed; the saved value shows again once it's left
  const [typing, setTyping] = useState<string | null>(null)
  const commit = (text: string) => {
    setTyping(null)
    if (!text.trim()) return !required && value && onChange({ target: { value: "" } })
    const iso = parse(text)
    if (iso && iso !== value && (!min || iso >= min)) onChange({ target: { value: iso } })
  }
  return (
    <div
      className={cn(
        "relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm dark:bg-input/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        placeholder="DD/MM/YYYY"
        value={typing ?? show(value)}
        onChange={(e) => setTyping(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && typing !== null && (e.preventDefault(), commit(typing))}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={aria["aria-label"]}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 tabular-nums outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => picker.current?.showPicker?.()}
        className="me-1 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label="Calendar"
      >
        <CalendarDays className="size-4" />
      </button>
      {/* The browser's calendar, opened by the button; never seen itself */}
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        min={min}
        onChange={(e) => e.target.value && onChange({ target: { value: e.target.value } })}
        className="pointer-events-none absolute bottom-0 end-0 size-0 opacity-0"
      />
    </div>
  )
}
