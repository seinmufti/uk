import Link from "next/link"
import { Amount } from "@/components/amount"
import { PageHeader } from "@/components/page-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLocale, getT } from "@/i18n/server"
import { formatDate } from "@/lib/dates"
import { getWallet } from "@/lib/data/wallet"
import { cn } from "@/lib/utils"

/** The wallet: the cash the business has, and every movement in and out of it (newest first). */
export default async function WalletPage() {
  const [t, locale, wallet] = await Promise.all([getT(), getLocale(), getWallet()])
  const rows = [...wallet.entries].reverse()
  const cards = [
    { label: t("wallet.balance"), value: wallet.balance, tone: wallet.balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400" },
    { label: t("wallet.in"), value: wallet.moneyIn, tone: "text-emerald-700 dark:text-emerald-400" },
    { label: t("wallet.out"), value: wallet.moneyOut, tone: "text-red-700 dark:text-red-400" },
  ]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:p-6">
      <PageHeader title={t("wallet.title")} />
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className={cn("text-lg font-semibold tabular-nums", c.tone)}>
              <Amount usd={c.value} />
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {/* In / out twice: a USD group, then an IQD group */}
            <TableRow>
              <TableHead rowSpan={2}>{t("common.date")}</TableHead>
              <TableHead rowSpan={2}>{t("common.description")}</TableHead>
              <TableHead rowSpan={2} className="hidden sm:table-cell">{t("common.type")}</TableHead>
              <TableHead colSpan={2} className="h-8 border-s text-center">USD</TableHead>
              <TableHead colSpan={2} className="h-8 border-s text-center">IQD</TableHead>
              <TableHead rowSpan={2} className="border-s text-end">{t("wallet.balance")}</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="h-8 border-s text-end">{t("wallet.in")}</TableHead>
              <TableHead className="h-8 border-s text-end">{t("wallet.out")}</TableHead>
              <TableHead className="h-8 border-s text-end">{t("wallet.in")}</TableHead>
              <TableHead className="h-8 border-s text-end">{t("wallet.out")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {t("wallet.empty")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap">{formatDate(e.date, locale)}</TableCell>
                <TableCell className="max-w-64 truncate">
                  {e.href ? (
                    <Link href={e.href} className="underline-offset-4 hover:underline">
                      {e.label}
                    </Link>
                  ) : (
                    e.label
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{t(`wallet.kind.${e.kind}`)}</TableCell>
                <TableCell className="border-s text-end text-emerald-700 dark:text-emerald-400">{e.amount > 0 ? <Amount usd={e.amount} mode="usd" /> : null}</TableCell>
                <TableCell className="border-s text-end text-red-700 dark:text-red-400">{e.amount < 0 ? <Amount usd={-e.amount} mode="usd" /> : null}</TableCell>
                <TableCell className="border-s text-end text-emerald-700 dark:text-emerald-400">{e.amount > 0 ? <Amount usd={e.amount} mode="iqd" rate={e.rate} /> : null}</TableCell>
                <TableCell className="border-s text-end text-red-700 dark:text-red-400">{e.amount < 0 ? <Amount usd={-e.amount} mode="iqd" rate={e.rate} /> : null}</TableCell>
                <TableCell className="border-s text-end font-medium">
                  <Amount usd={e.balance} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
