import { notFound } from "next/navigation"
import { InvoiceForm } from "@/components/invoice-form"
import { listParties } from "@/lib/data/parties"
import { getPurchase } from "@/lib/data/purchases"
import { getRate } from "@/lib/rate"

export default async function EditPurchasePage({ params }: PageProps<"/purchases/[id]/edit">) {
  const { id } = await params
  const [purchase, suppliers, rate] = await Promise.all([getPurchase(id), listParties("suppliers", { all: true }), getRate()])
  if (!purchase) notFound()
  return <InvoiceForm kind="purchase" invoice={purchase} parties={suppliers} number={purchase.number} liveRate={rate?.rate ?? null} />
}
