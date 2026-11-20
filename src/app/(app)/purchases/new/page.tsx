import { InvoiceForm } from "@/components/invoice-form"
import { listParties } from "@/lib/data/parties"
import { nextPurchaseNumber } from "@/lib/data/purchases"
import { getRate } from "@/lib/rate"

export default async function NewPurchasePage() {
  const [suppliers, number, rate] = await Promise.all([listParties("suppliers"), nextPurchaseNumber(), getRate()])
  return <InvoiceForm kind="purchase" parties={suppliers} number={number} liveRate={rate?.rate ?? null} />
}
