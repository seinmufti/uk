"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/provider"

/** A dialog holding a small form with Cancel / Save. */
export function FormDialog({
  title,
  open,
  onOpenChange,
  onSubmit,
  pending,
  children,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  pending: boolean
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** State for a form dialog: whether it's open, which row is being edited (null = new) and the form values. */
export function useEditor<F>(blank: () => F) {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string | null>(null)
  const [form, setForm] = useState<F>(blank)
  return {
    open,
    setOpen,
    id,
    form,
    set: <K extends keyof F>(key: K, value: F[K]) => setForm((f) => ({ ...f, [key]: value })),
    openNew: (overrides?: Partial<F>) => {
      setId(null)
      setForm({ ...blank(), ...overrides })
      setOpen(true)
    },
    openEdit: (rowId: string, values: F) => {
      setId(rowId)
      setForm(values)
      setOpen(true)
    },
  }
}
