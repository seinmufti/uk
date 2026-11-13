import { Plus } from "lucide-react"
import Link from "next/link"
import { DocList } from "@/components/doc-list"
import { PageHeader } from "@/components/page-header"
import { TwoPane } from "@/components/two-pane"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { listInvoices } from "@/lib/data/invoices"
import { docNumber, usd } from "@/lib/money"

export default async function InvoicesLayout({ children }: LayoutProps<"/invoices">) {
  const t = await getT()
  const invoices = await listInvoices()
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        inset={false}
        title={t("invoices.title")}
        actions={
          <Link href="/invoices/new" className={buttonVariants()}>
            <Plus /> {t("invoices.new")}
          </Link>
        }
      />
      <TwoPane
        list={
          <DocList
            basePath="/invoices"
            empty={t("invoices.empty")}
            items={invoices.map((i) => ({
              id: i.id,
              title: `#${docNumber(i.number)}`,
              subtitle: i.customer_name ?? t("invoices.noCustomer"),
              date: i.date,
              amount: usd(i.total_usd),
              badge: i.status === "paid" ? { label: t("invoices.status.paid"), tone: "good" } : { label: t("invoices.status.unpaid"), tone: "warn" },
            }))}
          />
        }
      >
        {children}
      </TwoPane>
    </div>
  )
}
