"use client"

import { Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/provider"
import type { ActionResult } from "@/lib/actions/result"
import { useAction } from "./use-action"

/** Asks first (in the app's own dialog, not the browser's confirm box, which some browsers block), then deletes. */
export function DeleteButton({ action, label, then }: { action: () => Promise<ActionResult>; label?: boolean; then?: () => void }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={label ? "destructive" : "ghost"} size={label ? "default" : "icon-sm"} disabled={pending} aria-label={t("common.delete")} onClick={() => setOpen(true)}>
        <Trash2 />
        {label && t("common.delete")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="pe-8 leading-snug">{t("common.confirmDelete")}</DialogTitle>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(action, { success: t("common.deleted"), then: () => (setOpen(false), then?.()) })}
            >
              <Trash2 /> {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
