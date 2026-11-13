"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { sectionColor } from "@/lib/section-colors"
import { cn } from "@/lib/utils"

/**
 * The bar at the top of every section: same height, padding and border everywhere, tinted in the
 * section's colour. Inside a padded page (p-4 md:p-6) it stretches out to the edges; pass
 * inset={false} where the page has no padding.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  inset = true,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  inset?: boolean
}) {
  const pathname = usePathname()
  const tab = useSearchParams().get("tab")
  const color = sectionColor(tab ? `${pathname}?tab=${tab}` : pathname)
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6 print:hidden",
        color?.tint ?? "bg-background",
        inset && "-mx-4 -mt-4 md:-mx-6 md:-mt-6",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {color && <span className={cn("h-6 w-1.5 shrink-0 rounded-full", color.bar)} />}
        <h1 className="shrink-0 text-lg font-semibold">{title}</h1>
        {subtitle && <p className="hidden truncate text-sm text-muted-foreground lg:block">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
