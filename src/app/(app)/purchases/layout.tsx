import { Plus } from "lucide-react"
import Link from "next/link"
import { DocList } from "@/components/doc-list"
import { TwoPane } from "@/components/two-pane"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { listPurchases } from "@/lib/data/purchases"
import { docNumber, usd } from "@/lib/money"

export default async function PurchasesLayout({ children }: LayoutProps<"/purchases">) {
  const t = await getT()
  const purchases = await listPurchases()
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 print:hidden">
        <h1 className="text-lg font-semibold">{t("purchases.title")}</h1>
        <Link href="/purchases/new" className={buttonVariants()}>
          <Plus /> {t("purchases.new")}
        </Link>
      </div>
      <TwoPane
        list={
          <DocList
            basePath="/purchases"
            empty={t("purchases.empty")}
            items={purchases.map((p) => ({
              id: p.id,
              title: `#${docNumber(p.number)}`,
              subtitle: p.supplier_name ?? t("purchases.noSupplier"),
              date: p.date,
              amount: usd(p.total_usd),
              badge: p.payment_status === "debt" ? { label: t("purchases.owed"), tone: "warn" } : { label: t("common.paid"), tone: "good" },
            }))}
          />
        }
      >
        {children}
      </TwoPane>
    </div>
  )
}
