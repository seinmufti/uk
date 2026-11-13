"use client"

import { useSelectedLayoutSegment } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * List on the start side, details (the child route) on the other. On phones only one shows: the list,
 * or the details once something is picked (or "new" is open).
 */
export function TwoPane({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const hasSelection = useSelectedLayoutSegment() !== null
  return (
    <div className="flex min-h-0 flex-1">
      <div className={cn("w-full shrink-0 flex-col border-e md:flex md:w-80 lg:w-96", hasSelection ? "hidden" : "flex")}>{list}</div>
      <div className={cn("min-w-0 flex-1 overflow-auto", hasSelection ? "block" : "hidden md:block")}>{children}</div>
    </div>
  )
}
