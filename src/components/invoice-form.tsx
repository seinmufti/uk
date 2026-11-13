"use client"

import { Plus, RefreshCw, Trash2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { saveInvoice } from "@/lib/actions/invoices"
import { today } from "@/lib/dates"
import type { Invoice, Party } from "@/lib/data/types"
import { docNumber, iqd, num, round2, usd, usdToIqd } from "@/lib/money"
import { Field, NativeSelect } from "./form-bits"
import { PartyDialog } from "./party-dialog"
import { useAction } from "./use-action"

type Row = { key: number; description: string; qty: string; total_usd: string }
let nextKey = 1
const blankRow = (): Row => ({ key: nextKey++, description: "", qty: "1", total_usd: "" })

export function InvoiceForm({
  customers: initialCustomers,
  invoice,
  number,
  liveRate,
}: {
  customers: Party[]
  invoice?: Invoice | null
  number: number
  liveRate: number | null
}) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const [customers, setCustomers] = useState(initialCustomers)
  const [customerId, setCustomerId] = useState(invoice?.customer_id ?? "")
  const [date, setDate] = useState(invoice?.date ?? today())
  const [rate, setRate] = useState(String(invoice?.rate_per_100 ?? liveRate ?? ""))
  const [notes, setNotes] = useState(invoice?.notes ?? "")
  const [rows, setRows] = useState<Row[]>(
    invoice?.items.length
      ? invoice.items.map((i) => ({ key: nextKey++, description: i.description, qty: String(i.qty), total_usd: String(i.total_usd) }))
      : [blankRow()],
  )
  const [newCustomer, setNewCustomer] = useState(false)

  const totalUsd = round2(rows.reduce((s, r) => s + num(r.total_usd), 0))
  const totalIqd = usdToIqd(totalUsd, num(rate))
  const update = (key: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    run(
      () =>
        saveInvoice(invoice?.id ?? null, {
          date,
          customer_id: customerId || null,
          rate_per_100: num(rate),
          notes: notes || null,
          items: rows.map((r) => ({ description: r.description, qty: num(r.qty), total_usd: num(r.total_usd) })),
        }),
      {
        success: invoice ? t("common.saved") : undefined,
        then: (saved) => {
          if (!invoice) toast.success(t("invoices.created", { number: docNumber(saved.number) }))
          router.push(`/invoices/${saved.id}`)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{invoice ? t("invoices.edit") : t("invoices.new")}</h2>
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm tabular-nums">#{docNumber(invoice?.number ?? number)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("invoices.customer")}>
          <div className="flex gap-2">
            <NativeSelect value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t("invoices.noCustomer")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" variant="outline" size="icon" onClick={() => setNewCustomer(true)} aria-label={t("invoices.newCustomer")} title={t("invoices.newCustomer")}>
              <UserPlus />
            </Button>
          </div>
        </Field>
        <Field label={t("common.date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">{t("invoices.items")}</div>
        <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[1fr_5rem_8rem_2rem] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>{t("common.description")}</span>
            <span>{t("common.qty")}</span>
            <span>{t("common.total")} (USD)</span>
            <span />
          </div>
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_5rem_8rem_2rem] items-center gap-2 border-b px-3 py-2 last:border-b-0">
              <Input
                value={row.description}
                onChange={(e) => update(row.key, { description: e.target.value })}
                placeholder={t("common.description")}
                aria-label={t("common.description")}
              />
              <Input type="number" step="any" min="0" value={row.qty} onChange={(e) => update(row.key, { qty: e.target.value })} aria-label={t("common.qty")} />
              <Input
                type="number"
                step="0.01"
                value={row.total_usd}
                onChange={(e) => update(row.key, { total_usd: e.target.value })}
                placeholder="0.00"
                aria-label={t("common.total")}
                className="text-end tabular-nums"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={rows.length === 1}
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                aria-label={t("common.delete")}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows([...rows, blankRow()])}>
              <Plus /> {t("invoices.addRow")}
            </Button>
            <div className="flex items-center gap-4 pe-10 text-sm">
              <span className="text-muted-foreground">{t("invoices.grandTotal")}</span>
              <span className="font-semibold tabular-nums">{usd(totalUsd)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <div className="text-sm font-medium">{t("invoices.summary")}</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("invoices.subtotalUsd")}</span>
          <span className="tabular-nums">{usd(totalUsd)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t("invoices.exchangeRate")}</span>
          <div className="flex items-center gap-2">
            {liveRate && num(rate) !== liveRate && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRate(String(liveRate))}>
                <RefreshCw /> {t("invoices.refreshRate")}
              </Button>
            )}
            <Input type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required className="w-32 text-end tabular-nums" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-medium">{t("invoices.totalIqd")}</span>
          <span className="text-lg font-semibold tabular-nums">{iqd(totalIqd)}</span>
        </div>
      </div>

      <Field label={t("common.notes")}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      <PartyDialog
        table="customers"
        open={newCustomer}
        onOpenChange={setNewCustomer}
        onSaved={(c) => {
          setCustomers([...customers, { id: c.id, name: c.name, phone: null, address: null, notes: null }].sort((a, b) => a.name.localeCompare(b.name)))
          setCustomerId(c.id)
        }}
      />
    </form>
  )
}
