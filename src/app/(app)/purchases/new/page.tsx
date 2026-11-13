import { PurchaseForm } from "@/components/purchase-form"
import { listParties } from "@/lib/data/parties"
import { nextPurchaseNumber } from "@/lib/data/purchases"

export default async function NewPurchasePage() {
  const [suppliers, number] = await Promise.all([listParties("suppliers"), nextPurchaseNumber()])
  return <PurchaseForm suppliers={suppliers} number={number} />
}
