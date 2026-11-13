"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteReceipt } from "@/lib/actions/receipts"
import { DeleteButton } from "./delete-button"

export function ReceiptActions({ id, printLabel, printIcon }: { id: string; printLabel: string; printIcon: React.ReactNode }) {
  const router = useRouter()
  return (
    <>
      <Button variant="outline" onClick={() => window.print()}>
        {printIcon} {printLabel}
      </Button>
      <DeleteButton action={() => deleteReceipt(id)} then={() => router.push("/receipts")} />
    </>
  )
}
