"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

/** A plain <select> styled like the inputs: fast, works everywhere, no portal. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Colour-coded form areas, so the parts of a document are easy to tell apart:
 * who and when (blue), the lines (violet), money and payment (amber), totals (green).
 */
export const AREA = {
  party: "rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-4",
  items: "overflow-hidden rounded-xl border border-violet-500/30",
  itemsHead: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  payment: "rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4",
  summary: "rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4",
  summaryTitle: "text-emerald-700 dark:text-emerald-300",
  rate: "border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/10",
  total: "text-emerald-700 dark:text-emerald-300",
}
