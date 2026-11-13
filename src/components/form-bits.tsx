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
  party: "rounded-xl border border-s-4 border-s-sky-500 bg-card p-4 shadow-xs",
  items: "overflow-hidden rounded-xl border border-s-4 border-s-violet-500 bg-card shadow-xs",
  itemsHead: "bg-muted/60 text-muted-foreground",
  payment: "rounded-xl border border-s-4 border-s-amber-500 bg-card p-4 shadow-xs",
  summary: "rounded-xl border border-s-4 border-s-emerald-500 bg-card p-4 shadow-xs",
  summaryTitle: "text-emerald-700 dark:text-emerald-400",
  rate: "border-primary/50 bg-brand-soft",
  total: "text-emerald-700 dark:text-emerald-400",
}
