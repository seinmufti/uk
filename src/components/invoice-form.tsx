"use client"

import { Check, FlaskConical, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { saveInvoice } from "@/lib/actions/invoices"
import { savePurchase } from "@/lib/actions/purchases"
import { today } from "@/lib/dates"
import { randomDemoInvoice } from "@/lib/demo-invoices"
import type { CurrencyMode, DocKind, Invoice, Party } from "@/lib/data/types"
import { docNumber, iqd, iqdToUsd, num, round2, round6, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { AREA, Field } from "./form-bits"
import { NumberInput } from "./number-input"
import { PartyPicker } from "./party-picker"
import { CurrencyToggle } from "./currency-toggle"
import { PartyDialog } from "./party-dialog"
import { useAction } from "./use-action"

type Row = { key: number; description: string; qty: string; cost: string }
let nextKey = 1
// The demo deployment (…/demo) gets a button that fills the form with sample data
const IS_DEMO = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").endsWith("/demo")

const blankRow = (): Row => ({ key: nextKey++, description: "", qty: "1", cost: "" })

// The words that differ between a sales invoice (to a customer) and a purchase invoice (from a supplier)
const WORDS = {
  sale: { party: "invoices.customer", noParty: "invoices.noCustomer", newParty: "invoices.newCustomer", new: "invoices.new", edit: "invoices.edit", created: "invoices.created", table: "customers", base: "/invoices" },
  purchase: { party: "purchases.supplier", noParty: "purchases.noSupplier", newParty: "purchases.newSupplier", new: "purchases.new", edit: "purchases.edit", created: "purchases.created", table: "suppliers", base: "/purchases" },
} as const

/** The form for sales and purchase invoices alike: currencies, lines, discount, payment, due date. */
export function InvoiceForm({
  kind = "sale",
  parties: initialCustomers,
  invoice,
  number,
  liveRate,
}: {
  kind?: DocKind
  parties: Party[]
  invoice?: Invoice | null
  number: number
  liveRate: number | null
}) {
  const { t } = useI18n()
  const W = WORDS[kind]
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
  // Payment: paid in full (follows the total), unpaid, or part paid (an amount, in the lines' currency)
  const [payment, setPayment] = useState<"full" | "none" | "part">(
    !invoice || invoice.amount_paid_usd <= 0 ? "none" : invoice.status === "paid" ? "full" : "part",
  )
  const [paidText, setPaidText] = useState(
    invoice && invoice.status !== "paid" && invoice.amount_paid_usd > 0
      ? String(invoice.currency_mode === "iqd" ? Math.round(usdToIqd(invoice.amount_paid_usd, invoice.rate_per_100)) : round2(invoice.amount_paid_usd))
      : "",
  )
  // Discount off the lines, typed in the lines' currency (IQD in IQD mode, else USD)
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "")
  const [discountText, setDiscountText] = useState(
    invoice?.discount_usd ? String(invoice.currency_mode === "iqd" ? Math.round(usdToIqd(invoice.discount_usd, invoice.rate_per_100)) : round2(invoice.discount_usd)) : "",
  )

  // Each line: qty x cost, in the currency the lines are typed in (IQD in IQD mode, else USD)
  const lineTotal = (r: Row) => num(r.qty) * num(r.cost)
  const linesTotal = rows.reduce((s, r) => s + lineTotal(r), 0)
  const discountLines = Math.min(num(discountText), linesTotal)
  // What the customer owes: the lines minus the discount (in the lines' currency)
  const netLines = linesTotal - discountLines
  const totalUsd = inIqd ? round6(iqdToUsd(netLines, num(rate))) : round2(netLines)
  const totalIqd = inIqd ? netLines : usdToIqd(totalUsd, num(rate))
  const money = (n: number) => (inIqd ? iqd(n) : usd(n))
  const cur = inIqd ? "IQD" : "USD"
  const paidLines = payment === "full" ? netLines : payment === "none" ? 0 : Math.min(num(paidText), netLines)
  const dueLines = Math.max(0, netLines - paidLines)
  const coversTotal = payment === "part" && netLines > 0 && num(paidText) >= netLines
  // The same amount in the other currency (shown small next to amounts typed in one)
  const other = (n: number) => (!num(rate) ? "" : inIqd ? usd(iqdToUsd(n, num(rate))) : iqd(usdToIqd(n, num(rate))))
  const owesSomething = payment !== "full" && !coversTotal
  const paidBox = useRef<HTMLDivElement>(null)

  // Switching to or from IQD converts the typed costs, so the invoice keeps its value
  const changeMode = (next: CurrencyMode) => {
    const r = num(rate)
    if ((next === "iqd") !== inIqd && r) {
      setRows(rows.map((row) => (row.cost === "" ? row : { ...row, cost: String(next === "iqd" ? Math.round(usdToIqd(num(row.cost), r)) : round2(iqdToUsd(num(row.cost), r))) })))
      if (paidText) setPaidText(String(next === "iqd" ? Math.round(usdToIqd(num(paidText), r)) : round2(iqdToUsd(num(paidText), r))))
      if (discountText) setDiscountText(String(next === "iqd" ? Math.round(usdToIqd(num(discountText), r)) : round2(iqdToUsd(num(discountText), r))))
    }
    setMode(next)
  }
  const update = (key: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const fillDemo = () => {
    const r = num(rate) || liveRate || 150000
    const d = randomDemoInvoice(customers.map((c) => c.id), r)
    if (!num(rate)) setRate(String(r))
    setMode(d.mode)
    setCustomerId(d.customerId)
    setDate(d.date)
    setRows(d.rows.map((row) => ({ key: nextKey++, ...row })))
    setPayment(d.payment)
    setPaidText(d.paidText)
    setNotes(d.notes)
    setDiscountText(d.discountText)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const save = kind === "sale" ? saveInvoice : savePurchase
    run(
      () =>
        save(invoice?.id ?? null, {
          date,
          customer_id: customerId || null,
          rate_per_100: num(rate),
          currency_mode: mode,
          discount_usd: inIqd ? round6(iqdToUsd(discountLines, num(rate))) : discountLines,
          amount_paid_usd: payment === "full" ? totalUsd : inIqd ? round6(iqdToUsd(paidLines, num(rate))) : paidLines,
          due_date: owesSomething ? dueDate || null : null,
          notes: notes || null,
          items: rows.map((r) => ({ description: r.description, qty: num(r.qty), unit_price_usd: inIqd ? round6(iqdToUsd(num(r.cost), num(rate))) : num(r.cost) })),
        }),
      {
        success: invoice ? t("common.saved") : undefined,
        then: (saved) => {
          if (!invoice) toast.success(t(W.created, { number: docNumber(saved.number) }))
          router.push(`${W.base}/${saved.id}`)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{invoice ? t(W.edit) : t(W.new)}</h2>
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm tabular-nums">#{docNumber(invoice?.number ?? number)}</span>
      </div>

      <div className="relative flex justify-center">
        <CurrencyToggle value={mode} onChange={changeMode} />
        {IS_DEMO && kind === "sale" && (
          // Demo only: fills the form with a random sample invoice
          <Button type="button" variant="outline" size="icon" onClick={fillDemo} title={t("invoices.sampleData")} aria-label={t("invoices.sampleData")} className="absolute end-0 top-1/2 -translate-y-1/2">
            <FlaskConical />
          </Button>
        )}
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", AREA.party)}>
        <Field label={t(W.party)}>
          <div className="flex gap-2">
            <PartyPicker parties={customers} value={customerId} onChange={setCustomerId} placeholder={t(W.noParty)} clearable />
            <Button type="button" variant="outline" size="icon" onClick={() => setNewCustomer(true)} aria-label={t(W.newParty)} title={t(W.newParty)}>
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
              <span className="flex flex-col items-end pe-1 text-end text-sm font-medium tabular-nums">
                {money(lineTotal(row))}
                {mode === "usd_iqd" && lineTotal(row) > 0 && <span className="text-xs font-normal text-muted-foreground">{other(lineTotal(row))}</span>}
              </span>
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
              <span className="flex flex-col items-end font-semibold tabular-nums">
                {money(linesTotal)}
                {mode === "usd_iqd" && linesTotal > 0 && <span className="text-xs font-normal text-muted-foreground">{other(linesTotal)}</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-3", AREA.summary)}>
        <div className={cn("text-sm font-medium", AREA.summaryTitle)}>{t("invoices.summary")}</div>
        {/* The lines added up, then the discount taken off them (both in the lines' currency) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t(inIqd ? "invoices.totalIqd" : "invoices.subtotalUsd")}</span>
          <span className="tabular-nums">{money(linesTotal)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("invoices.discount")} ({cur})
          </span>
          <NumberInput value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="0" className={cn("w-32 text-end tabular-nums", AREA.rate)} />
        </div>
        {discountLines > 0 && mode === "usd_iqd" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("invoices.afterDiscountUsd")}</span>
            <span className="font-medium tabular-nums">{usd(totalUsd)}</span>
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
          <span className="font-medium">
            {t(mode === "usd" ? (discountLines > 0 ? "invoices.afterDiscountUsd" : "invoices.totalUsd") : discountLines > 0 ? "invoices.afterDiscountIqd" : "invoices.totalIqd")}
          </span>
          <span className={cn("flex flex-col items-end text-lg font-semibold tabular-nums", AREA.total)}>
            {mode === "usd" ? usd(totalUsd) : iqd(totalIqd)}
            {/* The other currency too (USD → IQD already shows the USD total above) */}
            {mode !== "usd_iqd" && netLines > 0 && other(netLines) && <span className="text-xs font-normal text-muted-foreground">{other(netLines)}</span>}
          </span>
        </div>
      </div>

      <div className={cn("grid gap-3", AREA.payment)}>
        <div className="text-sm font-medium">{t("invoices.payment")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={payment === "none" ? "default" : "outline"} onClick={() => (setPayment("none"), setPaidText(""))}>
            {t("invoices.status.unpaid")}
          </Button>
          <Button
            type="button"
            variant={payment === "full" ? "default" : "outline"}
            onClick={() => setPayment("full")}
            // A typed amount that covers the whole invoice lights this up too (the amount box stays open)
            className={cn(coversTotal && "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300")}
          >
            <Check /> {t("invoices.paidInFull")}
          </Button>
          <Button type="button" variant={payment === "part" ? "default" : "outline"} onClick={() => (setPayment("part"), paidBox.current?.querySelector("input")?.focus())}>
            {t("invoices.paidAmountToggle")}
          </Button>
          {/* Always shown; clicking into it picks "Paid amount" */}
          <div ref={paidBox} className="flex items-center gap-2 sm:ms-auto">
            <span className="text-sm text-muted-foreground">{t("invoices.paidAmount")} ({cur})</span>
            <NumberInput
              onFocus={() => setPayment("part")}
              value={paidText}
              onChange={(e) => setPaidText(e.target.value)}
              placeholder="0"
              className={cn("w-36 text-end tabular-nums", AREA.rate)}
            />
          </div>
        </div>
        {paidLines > 0 && (
          // What was paid, in both currencies
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("invoices.paidAmount")}</span>
            <span className="flex flex-col items-end font-medium tabular-nums">
              {money(paidLines)}
              {other(paidLines) && <span className="text-xs font-normal text-muted-foreground">{other(paidLines)}</span>}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">{t("invoices.balanceDue")}</span>
          <span className={cn("flex flex-col items-end font-semibold tabular-nums", dueLines > 0 ? "text-amber-700 dark:text-amber-400" : AREA.total)}>
            {money(dueLines)}
            {dueLines > 0 && other(dueLines) && <span className="text-xs font-normal text-muted-foreground">{other(dueLines)}</span>}
          </span>
        </div>
        {owesSomething && (
          // When the rest has to be paid by
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{t("invoices.dueDate")}</span>
            <Input type="date" value={dueDate} min={date} onChange={(e) => setDueDate(e.target.value)} className="w-44" />
          </div>
        )}
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
        table={W.table}
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
