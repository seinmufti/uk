"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import type { ActionResult } from "@/lib/actions/result"
import { useAction } from "./use-action"

/** Asks first, then deletes. */
export function DeleteButton({ action, label, then }: { action: () => Promise<ActionResult>; label?: boolean; then?: () => void }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  return (
    <Button
      variant={label ? "destructive" : "ghost"}
      size={label ? "default" : "icon-sm"}
      disabled={pending}
      aria-label={t("common.delete")}
      onClick={() => confirm(t("common.confirmDelete")) && run(action, { success: t("common.deleted"), then })}
    >
      <Trash2 />
      {label && t("common.delete")}
    </Button>
  )
}
