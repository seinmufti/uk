import { InvoiceForm } from "@/components/invoice-form"
import { nextInvoiceNumber } from "@/lib/data/invoices"
import { listParties } from "@/lib/data/parties"
import { getRate } from "@/lib/rate"

export default async function NewInvoicePage() {
  const [customers, number, rate] = await Promise.all([listParties("customers"), nextInvoiceNumber(), getRate()])
  return <InvoiceForm customers={customers} number={number} liveRate={rate?.rate ?? null} />
}
