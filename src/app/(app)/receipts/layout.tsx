import { Plus } from "lucide-react"
import Link from "next/link"
import { DocList } from "@/components/doc-list"
import { PageHeader } from "@/components/page-header"
import { TwoPane } from "@/components/two-pane"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { listReceipts, receiptNumber } from "@/lib/data/receipts"
import { usd } from "@/lib/money"

export default async function ReceiptsLayout({ children }: LayoutProps<"/receipts">) {
  const t = await getT()
  const receipts = await listReceipts()
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        inset={false}
        title={t("receipts.title")}
        actions={
          <>
            <Link href="/receipts/new?kind=in" className={buttonVariants({ variant: "outline" })}>
              <Plus /> {t("receipts.newIn")}
            </Link>
            <Link href="/receipts/new?kind=out" className={buttonVariants()}>
              <Plus /> {t("receipts.newOut")}
            </Link>
          </>
        }
      />
      <TwoPane
        list={
          <DocList
            basePath="/receipts"
            empty={t("receipts.empty")}
            items={receipts.map((r) => ({
              id: r.id,
              title: receiptNumber(r.kind, r.number),
              subtitle: r.party,
              date: r.date,
              amount: `${r.kind === "in" ? "+" : "−"}${usd(r.amount_usd)}`,
              badge: r.kind === "in" ? { label: t("receipts.kind.in"), tone: "good" } : { label: t("receipts.kind.out"), tone: "warn" },
            }))}
          />
        }
      >
        {children}
      </TwoPane>
    </div>
  )
}
