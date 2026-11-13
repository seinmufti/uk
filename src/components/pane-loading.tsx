import { Loader2 } from "lucide-react"

/** Shown right away while a section or document loads, so clicks feel instant. */
export function PaneLoading() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
