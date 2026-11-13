import { notFound } from "next/navigation"
import { InvoiceForm } from "@/components/invoice-form"
import { getInvoice } from "@/lib/data/invoices"
import { listParties } from "@/lib/data/parties"
import { getRate } from "@/lib/rate"

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]/edit">) {
  const { id } = await params
  const [invoice, customers, rate] = await Promise.all([getInvoice(id), listParties("customers"), getRate()])
  if (!invoice) notFound()
  return <InvoiceForm invoice={invoice} customers={customers} number={invoice.number} liveRate={rate?.rate ?? null} />
}
