import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLocale, getT } from "@/i18n/server"
import { formatDate } from "@/lib/dates"
import { getWallet, type WalletTotals } from "@/lib/data/wallet"
import { iqd, usd } from "@/lib/money"
import { cn } from "@/lib/utils"

const green = "text-emerald-700 dark:text-emerald-400"
const red = "text-red-700 dark:text-red-400"

/** "$1,200.00" over "3,400,000 IQD": each currency on its own line, never added together */
function Totals({ value, tone }: { value: WalletTotals; tone?: (n: number) => string }) {
  return (
    <div className="grid gap-0.5 text-lg font-semibold tabular-nums">
      <bdi dir="ltr" className={tone?.(value.usd)}>{usd(value.usd)}</bdi>
      <bdi dir="ltr" className={tone?.(value.iqd)}>{iqd(value.iqd)}</bdi>
    </div>
  )
}

/**
 * The wallet: the cash the business has, and every movement in and out of it (newest first). USD and IQD
 * are kept apart: a movement shows in its own currency's columns and changes only that currency's balance.
 */
export default async function WalletPage() {
  const [t, locale, wallet] = await Promise.all([getT(), getLocale(), getWallet()])
  const rows = [...wallet.entries].reverse()
  const money = (n: number, cur: "usd" | "iqd") => <bdi dir="ltr" className="tabular-nums">{cur === "usd" ? usd(n) : iqd(n)}</bdi>
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:p-6">
      <PageHeader title={t("wallet.title")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">{t("wallet.balance")}</div>
          <Totals value={wallet.balance} tone={(n) => (n >= 0 ? green : red)} />
        </div>
        <div className={cn("rounded-lg border p-3", green)}>
          <div className="text-xs text-muted-foreground">{t("wallet.in")}</div>
          <Totals value={wallet.moneyIn} />
        </div>
        <div className={cn("rounded-lg border p-3", red)}>
          <div className="text-xs text-muted-foreground">{t("wallet.out")}</div>
          <Totals value={wallet.moneyOut} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {/* USD in / out / balance, then IQD in / out / balance */}
            <TableRow>
              <TableHead rowSpan={2}>{t("common.date")}</TableHead>
              <TableHead rowSpan={2}>{t("common.description")}</TableHead>
              <TableHead rowSpan={2} className="hidden sm:table-cell">{t("common.type")}</TableHead>
              <TableHead colSpan={3} className="h-8 border-s text-center">USD</TableHead>
              <TableHead colSpan={3} className="h-8 border-s text-center">IQD</TableHead>
            </TableRow>
            <TableRow>
              {[0, 1].map((g) => [
                <TableHead key={`${g}in`} className="h-8 border-s text-end">{t("wallet.in")}</TableHead>,
                <TableHead key={`${g}out`} className="h-8 border-s text-end">{t("wallet.out")}</TableHead>,
                <TableHead key={`${g}bal`} className="h-8 border-s text-end">{t("wallet.balance")}</TableHead>,
              ])}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
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
                {(["usd", "iqd"] as const).map((cur) => {
                  const mine = e.currency === cur
                  const balance = cur === "usd" ? e.balanceUsd : e.balanceIqd
                  return [
                    <TableCell key={`${cur}in`} className={cn("border-s text-end", green)}>{mine && e.amount > 0 ? money(e.amount, cur) : null}</TableCell>,
                    <TableCell key={`${cur}out`} className={cn("border-s text-end", red)}>{mine && e.amount < 0 ? money(-e.amount, cur) : null}</TableCell>,
                    // Each currency's balance; dim on rows that didn't change it
                    <TableCell key={`${cur}bal`} className={cn("border-s text-end", mine ? "font-medium" : "text-muted-foreground")}>{money(balance, cur)}</TableCell>,
                  ]
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
