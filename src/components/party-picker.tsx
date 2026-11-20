"use client"

import { Check, ChevronDown, X } from "lucide-react"
import { useId, useMemo, useRef, useState } from "react"
import { useI18n } from "@/i18n/provider"
import type { Party } from "@/lib/data/types"
import { cn } from "@/lib/utils"

/** What was typed, as a pattern: a regular expression when it is one (e.g. "^ka|trading$"), else plain text. */
function matcher(query: string) {
  const q = query.trim()
  if (!q) return () => true
  try {
    const re = new RegExp(q, "iu")
    return (name: string) => re.test(name)
  } catch {
    const lower = q.toLocaleLowerCase()
    return (name: string) => name.toLocaleLowerCase().includes(lower)
  }
}

/**
 * Pick a customer / supplier by typing: the list narrows with every letter (plain text or a regular
 * expression), arrow keys move, Enter picks, Escape closes.
 */
export function PartyPicker({
  parties,
  value,
  onChange,
  placeholder,
  required,
  clearable,
}: {
  parties: Party[]
  value: string
  onChange: (id: string) => void
  placeholder: string
  required?: boolean
  /** Shows an × to go back to no one picked */
  clearable?: boolean
}) {
  const { t } = useI18n()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const chosen = parties.find((p) => p.id === value)
  const shown = useMemo(() => {
    const match = matcher(query)
    return parties.filter((p) => match(p.name))
  }, [parties, query])

  const pick = (id: string) => {
    onChange(id)
    setQuery("")
    setOpen(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.max(0, Math.min(shown.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))))
    } else if (e.key === "Enter" && open) {
      e.preventDefault()
      if (shown[active]) pick(shown[active].id)
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        // While typing it shows what is typed; otherwise the picked name
        value={open ? query : (chosen?.name ?? "")}
        placeholder={chosen?.name ?? placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setQuery("")
        }}
        onKeyDown={onKey}
        required={required && !value}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent ps-2.5 pe-14 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="pointer-events-none absolute inset-y-0 end-2 flex items-center gap-1 text-muted-foreground">
        {clearable && value && (
          <button
            type="button"
            className="pointer-events-auto rounded p-0.5 hover:text-foreground"
            aria-label={t("common.clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("")}
          >
            <X className="size-3.5" />
          </button>
        )}
        <ChevronDown className="size-4" />
      </div>
      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md">
          {shown.length === 0 && <li className="px-2 py-1.5 text-muted-foreground">{t("common.noData")}</li>}
          {shown.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={p.id === value}
              // Keep the focus in the box so the click lands
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p.id)}
              className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5", i === active && "bg-accent text-accent-foreground")}
            >
              <span className="truncate">{p.name}</span>
              {p.id === value && <Check className="size-4 shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
