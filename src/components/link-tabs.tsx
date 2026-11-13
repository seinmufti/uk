import Link from "next/link"
import { cn } from "@/lib/utils"

/** Tabs that are links (?tab=…), so the server renders only the chosen one. */
export function LinkTabs({ tabs, active }: { tabs: { href: string; label: string; value: string }[]; active: string }) {
  return (
    <div className="inline-flex w-fit flex-wrap items-center rounded-lg bg-muted p-[3px] text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
            tab.value === active && "bg-background font-medium text-foreground shadow-sm",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
