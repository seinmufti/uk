"use client"

import { Banknote, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { deleteDebt, payDebt, saveDebt } from "@/lib/actions/records"
import { formatDate, today } from "@/lib/dates"
import type { Debt, DebtDirection, InvoiceRow } from "@/lib/data/types"
import { docNumber, num, round2, usd } from "@/lib/money"
import { DeleteButton } from "./delete-button"
import { Field } from "./form-bits"
import { NumberInput } from "./number-input"
import { FormDialog, useEditor } from "./form-dialog"
import { LinkTabs } from "./link-tabs"
import { PageHeader } from "./page-header"
import { useAction } from "./use-action"

const blank = () => ({ party: "", amount_usd: "", date: today(), due_date: "", notes: "" })

export function DebtsView({
  direction,
  debts,
  unpaidInvoices,
  totals,
}: {
  direction: DebtDirection
  debts: Debt[]
  unpaidInvoices: InvoiceRow[]
  totals: Record<DebtDirection, number>
}) {
  const { t, locale } = useI18n()
  const { pending, run } = useAction()
  const editor = useEditor(blank)
  const { form, set } = editor
  const [paying, setPaying] = useState<Debt | null>(null)
  const [payment, setPayment] = useState("")

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader
        title={t("debts.title")}
        subtitle={t("debts.subtitle")}
        actions={
          <Button onClick={() => editor.openNew()}>
            <Plus /> {t("debts.new")}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["receivable", "payable"] as const).map((d) => (
          <Link key={d} href={`/debts?tab=${d}`} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
            <div className="text-xs text-muted-foreground">
              {t(`debts.direction.${d}`)} · {t("debts.outstanding")}
            </div>
            <div className={d === "receivable" ? "text-lg font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums" : "text-lg font-semibold text-red-700 dark:text-red-400 tabular-nums"}>
              {usd(totals[d])}
            </div>
          </Link>
        ))}
      </div>
      <LinkTabs
        active={direction}
        tabs={(["receivable", "payable"] as const).map((d) => ({ value: d, href: `/debts?tab=${d}`, label: t(`debts.direction.${d}`) }))}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("debts.party")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("common.date")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("debts.dueDate")}</TableHead>
              <TableHead className="text-end">{t("common.amount")}</TableHead>
              <TableHead className="hidden text-end sm:table-cell">{t("common.paid")}</TableHead>
              <TableHead className="text-end">{t("common.remaining")}</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t("debts.empty")}
                </TableCell>
              </TableRow>
            )}
            {debts.map((debt) => {
              const left = round2(debt.amount_usd - debt.paid_usd)
              return (
                <TableRow key={debt.id}>
                  <TableCell>
                    <div className="font-medium">{debt.party}</div>
                    {debt.purchase_id ? (
                      <Link href={`/purchases/${debt.purchase_id}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                        {debt.notes}
                      </Link>
                    ) : (
                      debt.notes && <div className="max-w-56 truncate text-xs text-muted-foreground">{debt.notes}</div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(debt.date, locale)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(debt.due_date, locale)}</TableCell>
                  <TableCell className="text-end tabular-nums">{usd(debt.amount_usd)}</TableCell>
                  <TableCell className="hidden text-end tabular-nums sm:table-cell">{usd(debt.paid_usd)}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {left <= 0 ? <Badge variant="secondary">{t("debts.settled")}</Badge> : <span className="font-medium">{usd(left)}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {left > 0 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("debts.addPayment")}
                          title={t("debts.addPayment")}
                          onClick={() => {
                            setPaying(debt)
                            setPayment(String(left))
                          }}
                        >
                          <Banknote />
                        </Button>
                      )}
                      {!debt.purchase_id && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("common.edit")}
                          onClick={() =>
                            editor.openEdit(debt.id, {
                              party: debt.party,
                              amount_usd: String(debt.amount_usd),
                              date: debt.date,
                              due_date: debt.due_date ?? "",
                              notes: debt.notes ?? "",
                            })
                          }
                        >
                          <Pencil />
                        </Button>
                      )}
                      <DeleteButton action={() => deleteDebt(debt.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {direction === "receivable" && unpaidInvoices.length > 0 && (
        <div className="grid gap-2">
          <h2 className="text-sm font-medium">{t("debts.unpaidInvoices")}</h2>
          <div className="divide-y rounded-lg border">
            {unpaidInvoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/50">
                <span>
                  <span className="font-mono">#{docNumber(inv.number)}</span> · {inv.customer_name ?? t("invoices.noCustomer")}
                </span>
                <span className="font-medium tabular-nums">{usd(inv.total_usd)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <FormDialog
        title={editor.id ? t("debts.edit") : t("debts.new")}
        open={editor.open}
        onOpenChange={editor.setOpen}
        pending={pending}
        onSubmit={() =>
          run(() => saveDebt(editor.id, { ...form, direction, amount_usd: num(form.amount_usd), due_date: form.due_date || null, notes: form.notes || null }), {
            success: t("common.saved"),
            then: () => editor.setOpen(false),
          })
        }
      >
        <div className="text-sm text-muted-foreground">{t(`debts.direction.${direction}`)}</div>
        <Field label={t("debts.party")}>
          <Input value={form.party} onChange={(e) => set("party", e.target.value)} required autoFocus />
        </Field>
        <Field label={`${t("common.amount")} (USD)`}>
          <NumberInput  step="0.01" min="0" value={form.amount_usd} onChange={(e) => set("amount_usd", e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.date")}>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </Field>
          <Field label={t("debts.dueDate")}>
            <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
          </Field>
        </div>
        <Field label={t("common.notes")}>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </Field>
      </FormDialog>

      <FormDialog
        title={`${t("debts.addPayment")}${paying ? ` · ${paying.party}` : ""}`}
        open={!!paying}
        onOpenChange={(open) => !open && setPaying(null)}
        pending={pending}
        onSubmit={() => paying && run(() => payDebt(paying.id, num(payment)), { success: t("common.saved"), then: () => setPaying(null) })}
      >
        <Field label={t("debts.paymentAmount")}>
          <NumberInput  step="0.01" min="0" value={payment} onChange={(e) => setPayment(e.target.value)} required autoFocus />
        </Field>
      </FormDialog>
    </div>
  )
}
