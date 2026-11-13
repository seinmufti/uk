"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const CODE = "+964"

/** Local digits → "750 131 4159" (3, 3, 4). A leading 0 (0750…) is dropped: +964 replaces it. */
function spaced(digits: string) {
  const d = digits.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ")
}

/** "+964 750 131 4159" → "750 131 4159" for the box (older numbers without +964 work too). */
const localPart = (value: string) => spaced(value.trim().startsWith(CODE) ? value.trim().slice(CODE.length) : value)

/**
 * An Iraqi phone number: +964 is always there in front, the rest is spaced 3 3 4 as you type.
 * The value is the full number, e.g. "+964 750 131 4159" (empty when nothing is typed).
 */
export function PhoneInput({ value, onChange, className, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string
  onChange: (value: string) => void
}) {
  const local = localPart(value)
  return (
    <div dir="ltr" className={cn("flex items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/50", className)}>
      <span className="ps-2.5 pe-1.5 text-sm text-muted-foreground tabular-nums select-none">{CODE}</span>
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        value={local}
        placeholder="750 123 4567"
        onChange={(e) => {
          const next = spaced(e.target.value)
          onChange(next ? `${CODE} ${next}` : "")
        }}
        className="border-0 bg-transparent ps-0 tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  )
}
