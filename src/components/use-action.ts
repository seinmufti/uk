"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import type { ActionResult } from "@/lib/actions/result"

/** Runs a server action, shows its error (or `success`) in a toast, and reports whether it's running. */
export function useAction() {
  const [pending, start] = useTransition()
  const run = <T,>(action: () => Promise<ActionResult<T>>, opts?: { success?: string; then?: (r: { ok: true } & T) => void }) =>
    start(async () => {
      try {
        const result = await action()
        if (!result.ok) return void toast.error(result.error)
        if (opts?.success) toast.success(opts.success)
        opts?.then?.(result)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e))
      }
    })
  return { pending, run }
}
