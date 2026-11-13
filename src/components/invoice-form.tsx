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
import type { CurrencyMode, Invoice, Party } from "@/lib/data/types"
import { docNumber, iqd, iqdToUsd, num, round2, round6, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { AREA, Field, NativeSelect } from "./form-bits"
import { NumberInput } from "./number-input"
import { CurrencyToggle } from "./currency-toggle"
import { PartyDialog } from "./party-dialog"
import { useAction } from "./use-action"

type Row = { key: number; description: string; qty: string; cost: string }
let nextKey = 1
const blankRow = (): Row => ({ key: nextKey++, description: "", qty: "1", cost: "" })

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
  const [mode, setMode] = useState<CurrencyMode>(invoice?.currency_mode ?? "usd_iqd")
  const inIqd = mode === "iqd" // lines are typed and shown in IQD
  const [notes, setNotes] = useState(invoice?.notes ?? "")
  const [rows, setRows] = useState<Row[]>(
    invoice?.items.length
      ? invoice.items.map((i) => ({ key: nextKey++, description: i.description, qty: String(i.qty), cost: String(invoice.currency_mode === "iqd" ? round2(usdToIqd(i.unit_price_usd, invoice.rate_per_100)) : i.unit_price_usd) }))
      : [blankRow()],
  )
  const [newCustomer, setNewCustomer] = useState(false)

  // Each line: qty x cost, in the currency the lines are typed in (IQD in IQD mode, else USD)
  const lineTotal = (r: Row) => num(r.qty) * num(r.cost)
  const linesTotal = rows.reduce((s, r) => s + lineTotal(r), 0)
  const totalUsd = inIqd ? round6(iqdToUsd(linesTotal, num(rate))) : round2(linesTotal)
  const totalIqd = inIqd ? linesTotal : usdToIqd(totalUsd, num(rate))
  const money = (n: number) => (inIqd ? iqd(n) : usd(n))
  const cur = inIqd ? "IQD" : "USD"

  // Switching to or from IQD converts the typed costs, so the invoice keeps its value
  const changeMode = (next: CurrencyMode) => {
    const r = num(rate)
    if ((next === "iqd") !== inIqd && r) {
      setRows(rows.map((row) => (row.cost === "" ? row : { ...row, cost: String(next === "iqd" ? Math.round(usdToIqd(num(row.cost), r)) : round2(iqdToUsd(num(row.cost), r))) })))
    }
    setMode(next)
  }
  const update = (key: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    run(
      () =>
        saveInvoice(invoice?.id ?? null, {
          date,
          customer_id: customerId || null,
          rate_per_100: num(rate),
          currency_mode: mode,
          notes: notes || null,
          items: rows.map((r) => ({ description: r.description, qty: num(r.qty), unit_price_usd: inIqd ? round6(iqdToUsd(num(r.cost), num(rate))) : num(r.cost) })),
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

      <div className="flex justify-center">
        <CurrencyToggle value={mode} onChange={changeMode} />
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", AREA.party)}>
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
        <div className={AREA.items}>
          <div className={`hidden grid-cols-[1fr_4.5rem_7rem_7rem_2rem] gap-2 border-b px-3 py-2 text-xs font-medium ${AREA.itemsHead} sm:grid`}>
            <span>{t("common.description")}</span>
            <span>{t("common.qty")}</span>
            <span className="text-end">{t("invoices.cost")} ({cur})</span>
            <span className="text-end">{t("common.total")} ({cur})</span>
            <span />
          </div>
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_4.5rem_7rem_7rem_2rem] items-center gap-2 border-b px-3 py-2 last:border-b-0">
              <Input
                value={row.description}
                onChange={(e) => update(row.key, { description: e.target.value })}
                placeholder={t("common.description")}
                aria-label={t("common.description")}
              />
              <NumberInput  step="any" min="0" value={row.qty} onChange={(e) => update(row.key, { qty: e.target.value })} aria-label={t("common.qty")} />
              <NumberInput
                value={row.cost}
                onChange={(e) => update(row.key, { cost: e.target.value })}
                placeholder={inIqd ? "0" : "0.00"}
                aria-label={t("invoices.cost")}
                className="text-end tabular-nums"
              />
              <span className="pe-1 text-end text-sm font-medium tabular-nums">{money(lineTotal(row))}</span>
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
              <span className="font-semibold tabular-nums">{money(linesTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-3", AREA.summary)}>
        <div className={cn("text-sm font-medium", AREA.summaryTitle)}>{t("invoices.summary")}</div>
        {mode === "usd_iqd" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("invoices.subtotalUsd")}</span>
            <span className="tabular-nums">{usd(totalUsd)}</span>
          </div>
        )}
        {/* USD only: no rate needed (the current one is still saved with the invoice) */}
        <div className={cn("flex flex-wrap items-center justify-between gap-2 text-sm", mode === "usd" && "hidden")}>
          <span className="text-muted-foreground">{t("invoices.exchangeRate")}</span>
          <div className="flex items-center gap-2">
            {liveRate && num(rate) !== liveRate && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRate(String(liveRate))}>
                <RefreshCw /> {t("invoices.refreshRate")}
              </Button>
            )}
            <NumberInput  step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required className={cn("w-32 text-end tabular-nums", AREA.rate)} />
          </div>
        </div>
        <div className={cn("flex items-center justify-between", mode !== "usd" && "border-t pt-3")}>
          <span className="font-medium">{t(mode === "usd" ? "invoices.totalUsd" : "invoices.totalIqd")}</span>
          <span className={cn("text-lg font-semibold tabular-nums", AREA.total)}>{mode === "usd" ? usd(totalUsd) : iqd(totalIqd)}</span>
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
