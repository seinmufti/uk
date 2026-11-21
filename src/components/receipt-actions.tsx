"use client"

import { Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { deleteReceipt } from "@/lib/actions/receipts"
import { DeleteButton } from "./delete-button"

export function ReceiptActions({ id, printLabel, printIcon }: { id: string; printLabel: string; printIcon: React.ReactNode }) {
  const router = useRouter()
  const { t } = useI18n()
  return (
    <>
      <Link href={`/receipts/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
        <Pencil /> {t("common.edit")}
      </Link>
      <Button variant="outline" onClick={() => window.print()}>
        {printIcon} {printLabel}
      </Button>
      <DeleteButton action={() => deleteReceipt(id)} then={() => router.push("/receipts")} />
    </>
  )
}
