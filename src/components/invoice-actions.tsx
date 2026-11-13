"use client"

import { Check, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { deleteInvoice, setInvoiceStatus } from "@/lib/actions/invoices"
import { DeleteButton } from "./delete-button"
import { useAction } from "./use-action"

export function InvoiceActions({ id, status }: { id: string; status: "paid" | "unpaid" }) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => run(() => setInvoiceStatus(id, status === "paid" ? "unpaid" : "paid"))}>
        {status === "paid" ? <Undo2 /> : <Check />}
        {t(status === "paid" ? "invoices.markUnpaid" : "invoices.markPaid")}
      </Button>
      <DeleteButton action={() => deleteInvoice(id)} then={() => router.push("/invoices")} />
    </>
  )
}
