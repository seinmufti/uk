import { Plus } from "lucide-react"
import Link from "next/link"
import { Amount } from "@/components/amount"
import { DocList } from "@/components/doc-list"
import { LinkTabs } from "@/components/link-tabs"
import { PageHeader } from "@/components/page-header"
import { TwoPane } from "@/components/two-pane"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { today } from "@/lib/dates"
import { listInvoices } from "@/lib/data/invoices"
import { listPurchases } from "@/lib/data/purchases"
import type { DocKind, InvoiceRow } from "@/lib/data/types"
import { isEnabled } from "@/lib/features"
import { docNumber, iqd, usd, usdToIqd } from "@/lib/money"

/**
 * Sales invoices (/invoices) and purchase invoices (/purchases) side by side: the same list and header,
 * with tabs to switch between selling and buying.
 */
export async function DocsLayout({ kind, children }: { kind: DocKind; children: React.ReactNode }) {
  const t = await getT()
  const sale = kind === "sale"
  const rows: InvoiceRow[] = await (sale ? listInvoices() : listPurchases())
  const base = sale ? "/invoices" : "/purchases"
  const now = today()
  const badge = (r: InvoiceRow) =>
    r.status === "paid"
      ? ({ label: t("invoices.status.paid"), tone: "good" } as const)
      : r.due_date && r.due_date < now
        ? ({ label: t("invoices.overdue"), tone: "bad" } as const)
        : ({ label: t(r.amount_paid_usd > 0 ? "invoices.partlyPaid" : "invoices.status.unpaid"), tone: "warn" } as const)
  const tabs = isEnabled("invoices") && isEnabled("purchases")
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        inset={false}
        title={t(sale ? "invoices.title" : "purchases.title")}
        actions={
          <Link href={`${base}/new`} prefetch className={buttonVariants()}>
            <Plus /> {t(sale ? "invoices.new" : "purchases.new")}
          </Link>
        }
      />
      <TwoPane
        list={
          <>
            {tabs && (
              <div className="border-b p-2">
                <LinkTabs
                  active={kind}
                  tabs={[
                    { value: "sale", href: "/invoices", label: t("invoices.salesTab") },
                    { value: "purchase", href: "/purchases", label: t("invoices.purchasesTab") },
                  ]}
                />
              </div>
            )}
            <DocList
              basePath={base}
              empty={t(sale ? "invoices.empty" : "purchases.empty")}
              items={rows.map((r) => ({
                id: r.id,
                title: `#${docNumber(r.number)}`,
                subtitle: r.customer_name ?? t(sale ? "invoices.noCustomer" : "purchases.noSupplier"),
                date: r.date,
                // Both currencies: the invoice's own one first
                amount: <Amount usd={r.total_usd} rate={r.rate_per_100} mode={r.currency_mode} />,
                text: `${usd(r.total_usd)} ${r.rate_per_100 ? iqd(usdToIqd(r.total_usd, r.rate_per_100)) : ""}`,
                badge: badge(r),
              }))}
            />
          </>
        }
      >
        {children}
      </TwoPane>
    </div>
  )
}
