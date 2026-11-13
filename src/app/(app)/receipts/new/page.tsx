import { ReceiptForm } from "@/components/receipt-form"
import { listParties } from "@/lib/data/parties"
import { listOpenItems, nextReceiptNumber, receiptNumber } from "@/lib/data/receipts"
import { getRate } from "@/lib/rate"

export default async function NewReceiptPage({ searchParams }: PageProps<"/receipts/new">) {
  const { kind } = await searchParams
  const [customers, suppliers, open, nIn, nOut, rate] = await Promise.all([
    listParties("customers"),
    listParties("suppliers"),
    listOpenItems(),
    nextReceiptNumber("in"),
    nextReceiptNumber("out"),
    getRate(),
  ])
  return (
    <ReceiptForm
      kind={kind === "out" ? "out" : "in"}
      customers={customers}
      suppliers={suppliers}
      open={open}
      numbers={{ in: receiptNumber("in", nIn), out: receiptNumber("out", nOut) }}
      liveRate={rate?.rate ?? null}
    />
  )
}
