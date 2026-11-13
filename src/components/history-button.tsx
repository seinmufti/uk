"use client"

import { Redo2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { redoChange, undoChange } from "@/lib/actions/history"
import { useAction } from "./use-action"

/** Undo a change, or redo one that was undone. */
export function HistoryButton({ id, undone }: { id: string; undone: boolean }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  return undone ? (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => redoChange(id), { success: t("history.redone") })}>
      <Redo2 /> {t("history.redo")}
    </Button>
  ) : (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => undoChange(id), { success: t("history.undoneToast") })}>
      <Undo2 /> {t("history.undo")}
    </Button>
  )
}
