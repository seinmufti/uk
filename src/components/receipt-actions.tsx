"use client"

import { Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/i18n/provider"
import { deleteReceipt } from "@/lib/actions/receipts"
import { DeleteButton } from "./delete-button"

export function ReceiptActions({ id }: { id: string }) {
  const router = useRouter()
  const { t } = useI18n()
  return (
    <>
      <Link href={`/receipts/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
        <Pencil /> {t("common.edit")}
      </Link>
      <DeleteButton action={() => deleteReceipt(id)} then={() => router.push("/receipts")} />
    </>
  )
}
