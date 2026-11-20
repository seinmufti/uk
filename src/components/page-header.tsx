import { cn } from "@/lib/utils"
import { NavTitle } from "./nav-title"

/**
 * A section's title (shown in the middle of the top bar) and its toolbar: tabs or a short note on the
 * start side, the section's buttons on the end side, all on one row. Inside a padded page (p-4 md:p-6)
 * the toolbar stretches out to the edges; pass inset={false} where the page has no padding.
 */
export function PageHeader({
  title,
  subtitle,
  tabs,
  actions,
  inset = true,
}: {
  title: string
  subtitle?: string
  tabs?: React.ReactNode
  actions?: React.ReactNode
  inset?: boolean
}) {
  return (
    <>
      <NavTitle title={title} />
      {(tabs || subtitle || actions) && (
        <div
          className={cn(
            "flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2 md:px-6 print:hidden",
            inset && "-mx-4 -mt-4 md:-mx-6 md:-mt-6",
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {tabs}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </>
  )
}
