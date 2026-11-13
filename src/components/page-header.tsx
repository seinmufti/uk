import { cn } from "@/lib/utils"

/**
 * The bar at the top of every section: same height, padding and border everywhere. Inside a padded page
 * (p-4 md:p-6) it stretches out to the edges; pass inset={false} where the page has no padding.
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
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 md:px-6 print:hidden",
        inset && "-mx-4 -mt-4 md:-mx-6 md:-mt-6",
      )}
    >
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="shrink-0 text-lg font-semibold">{title}</h1>
        {subtitle && <p className="hidden truncate text-sm text-muted-foreground lg:block">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
