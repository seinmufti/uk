"use client"

import { PackagePlus, Printer } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { deletePurchase, sendPurchaseToInventory } from "@/lib/actions/purchases"
import { DeleteButton } from "./delete-button"
import { useAction } from "./use-action"

export function PurchaseActions({ id, sent }: { id: string; sent: boolean }) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  return (
    <>
      {!sent && (
        <Button disabled={pending} onClick={() => run(() => sendPurchaseToInventory(id), { success: t("purchases.sentToast") })}>
          <PackagePlus /> {t("purchases.sendToInventory")}
        </Button>
      )}
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> {t("common.print")}
      </Button>
      <DeleteButton action={() => deletePurchase(id)} then={() => router.push("/purchases")} />
    </>
  )
}
