import { notFound } from "next/navigation"
import { PurchaseForm } from "@/components/purchase-form"
import { listParties } from "@/lib/data/parties"
import { getPurchase } from "@/lib/data/purchases"

export default async function EditPurchasePage({ params }: PageProps<"/purchases/[id]/edit">) {
  const { id } = await params
  const [purchase, suppliers] = await Promise.all([getPurchase(id), listParties("suppliers")])
  if (!purchase) notFound()
  return <PurchaseForm purchase={purchase} suppliers={suppliers} number={purchase.number} />
}
