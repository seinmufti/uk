"use client"

import { PhoneInput } from "./phone-input"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { saveParty } from "@/lib/actions/parties"
import type { Party } from "@/lib/data/types"
import { Field } from "./form-bits"
import { useAction } from "./use-action"

/** Create or edit a customer / supplier. */
export function PartyDialog({
  table,
  open,
  onOpenChange,
  party,
  onSaved,
}: {
  table: "customers" | "suppliers"
  open: boolean
  onOpenChange: (open: boolean) => void
  party?: Party | null
  onSaved?: (row: { id: string; name: string }) => void
}) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" })
  const [shownFor, setShownFor] = useState<string | null | undefined>(undefined)

  // Fill the form each time the dialog opens
  const key = open ? (party?.id ?? "new") : null
  if (key !== shownFor) {
    setShownFor(key)
    if (open) setForm({ name: party?.name ?? "", phone: party?.phone ?? "", address: party?.address ?? "", notes: party?.notes ?? "" })
  }

  const isCustomer = table === "customers"
  const title = party ? t(isCustomer ? "customers.edit" : "suppliers.edit") : t(isCustomer ? "customers.new" : "suppliers.new")
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value })

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
            run(() => saveParty(table, party?.id ?? null, form), {
              success: t("common.saved"),
              then: (row) => {
                onOpenChange(false)
                onSaved?.(row)
              },
            })
          }}
        >
          <Field label={t("common.name")}>
            <Input value={form.name} onChange={set("name")} required autoFocus />
          </Field>
          <Field label={t("common.phone")}>
            <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          </Field>
          {!isCustomer && (
            <Field label={t("common.address")}>
              <Input value={form.address} onChange={set("address")} />
            </Field>
          )}
          <Field label={t("common.notes")}>
            <Textarea value={form.notes} onChange={set("notes")} rows={2} />
          </Field>
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
