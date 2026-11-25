"use client"

import { ArrowDownLeft, ArrowUpRight, RefreshCw, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { saveReceipt } from "@/lib/actions/receipts"
import { today } from "@/lib/dates"
import type { AmountCurrency, OpenItem, Party, Receipt, ReceiptKind } from "@/lib/data/types"
import { iqd, num, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { DateInput } from "./date-input"
import { AREA, Field, NativeSelect } from "./form-bits"
import { MoneyInput } from "./money-input"
import { NumberInput } from "./number-input"
import { PartyPicker } from "./party-picker"
import { PartyDialog } from "./party-dialog"
import { useAction } from "./use-action"

const NONE = ""

export function ReceiptForm({
  kind: initialKind,
  customers: initialCustomers,
  suppliers: initialSuppliers,
  open,
  numbers,
  liveRate,
  preselect,
  receipt,
}: {
  kind: ReceiptKind
  customers: Party[]
  suppliers: Party[]
  open: Record<ReceiptKind, OpenItem[]>
  numbers: Record<ReceiptKind, string>
  liveRate: number | null
  /** "invoice:<id>" or "debt:<id>": what the receipt pays, chosen up front */
  preselect?: string
  /** Changing an existing receipt: its current values */
  receipt?: Receipt | null
}) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const [kind, setKind] = useState<ReceiptKind>(initialKind)
  const [parties, setParties] = useState({ in: initialCustomers, out: initialSuppliers })
  const start = preselect ? open[initialKind].find((i) => `${i.type}:${i.id}` === preselect) : undefined
  const editingFor = receipt?.invoice_id ? `invoice:${receipt.invoice_id}` : receipt?.debt_id ? `debt:${receipt.debt_id}` : NONE
  const [partyId, setPartyId] = useState(
    receipt ? ((receipt.kind === "in" ? receipt.customer_id : receipt.supplier_id) ?? NONE) : start ? ((initialKind === "in" ? start.customer_id : start.supplier_id) ?? NONE) : NONE,
  )
  const [forKey, setForKey] = useState(receipt ? editingFor : start ? preselect! : NONE) // "invoice:<id>" | "debt:<id>" | ""
  const [amount, setAmount] = useState(receipt ? String(receipt.amount_usd) : start ? String(start.remaining) : "")
  const [date, setDate] = useState(receipt?.date ?? today())
  const [rate, setRate] = useState(String(receipt?.rate_per_100 ?? liveRate ?? ""))
  const [notes, setNotes] = useState(receipt?.notes ?? "")
  // The currency the amount is typed in (saved with the receipt, so it shows the same way)
  const [currency, setCurrency] = useState<AmountCurrency>(receipt?.currency ?? "usd")
  const [newParty, setNewParty] = useState(false)

  const party = parties[kind].find((p) => p.id === partyId)
  // What this party still owes / is owed: matched by id, or by name for debts typed by hand
  const items = party
    ? open[kind].filter((i) => (kind === "in" ? i.customer_id : i.supplier_id) === party.id || i.party.trim().toLowerCase() === party.name.trim().toLowerCase())
    : []
  const chosen = items.find((i) => `${i.type}:${i.id}` === forKey)

  const switchKind = (k: ReceiptKind) => {
    setKind(k)
    setPartyId(NONE)
    setForKey(NONE)
  }
  const pickParty = (id: string) => {
    setPartyId(id)
    setForKey(NONE)
  }
  const pickFor = (key: string) => {
    setForKey(key)
    const item = items.find((i) => `${i.type}:${i.id}` === key)
    if (item) setAmount(String(item.remaining))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    run(
      () =>
        saveReceipt(receipt?.id ?? null, {
          kind,
          date,
          party_id: partyId,
          amount_usd: num(amount),
          rate_per_100: num(rate),
          // Everything is paid in cash
          method: "cash",
          currency,
          invoice_id: chosen?.type === "invoice" ? chosen.id : null,
          debt_id: chosen?.type === "debt" ? chosen.id : null,
          notes: notes || null,
        }),
      {
        then: (saved) => {
          if (receipt) toast.success(t("common.saved"))
          else toast.success(t("receipts.created", { number: numbers[kind] }))
          router.push(`/receipts/${saved.id}`)
        },
      },
    )
  }

  const table = kind === "in" ? "customers" : "suppliers"
  return (
    <form onSubmit={submit} className="mx-auto grid max-w-2xl gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t(receipt ? "receipts.edit" : "receipts.new")}</h2>
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm tabular-nums">{numbers[kind]}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["in", "out"] as const).map((k) => {
          const Icon = k === "in" ? ArrowDownLeft : ArrowUpRight
          return (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-start transition-colors",
                kind === k ? "border-foreground/40 bg-muted" : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Icon className={cn("size-5 shrink-0", k === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400")} />
              <span>
                <span className="block text-sm font-medium text-foreground">{t(k === "in" ? "receipts.newIn" : "receipts.newOut")}</span>
                <span className="block text-xs">{t(`receipts.kindLong.${k}`)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", AREA.party)}>
        <Field label={t(kind === "in" ? "receipts.customer" : "receipts.supplier")}>
          <div className="flex gap-2">
            <PartyPicker parties={parties[kind]} value={partyId} onChange={pickParty} placeholder={t("receipts.choose")} required />
            <Button type="button" variant="outline" size="icon" onClick={() => setNewParty(true)} aria-label={t(kind === "in" ? "receipts.customer" : "receipts.supplier")}>
              <UserPlus />
            </Button>
          </div>
        </Field>
        <Field label={t("common.date")}>
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>

      <Field label={t("receipts.for")}>
        <NativeSelect value={forKey} onChange={(e) => pickFor(e.target.value)} disabled={!party}>
          <option value={NONE}>{t("receipts.onAccount")}</option>
          {items.map((i) => (
            <option key={`${i.type}:${i.id}`} value={`${i.type}:${i.id}`}>
              {i.label} · {t("receipts.left", { amount: usd(i.remaining) })}
            </option>
          ))}
        </NativeSelect>
        {party && items.length === 0 && <p className="text-xs text-muted-foreground">{t("receipts.nothingOwed")}</p>}
      </Field>

      <div className={cn("grid gap-4", AREA.payment)}>
        <Field label={t("receipts.amount")}>
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} rate={num(rate)} currency={currency} onCurrencyChange={setCurrency} required />
        </Field>
      </div>

      <div className={cn("grid gap-3", AREA.summary)}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t("receipts.exchangeRate")}</span>
          <div className="flex items-center gap-2">
            {liveRate && num(rate) !== liveRate && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRate(String(liveRate))}>
                <RefreshCw /> {t("invoices.refreshRate")}
              </Button>
            )}
            <NumberInput  step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required className={cn("w-32 text-end tabular-nums", AREA.rate)} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="font-medium">{t("receipts.amountIqd")}</span>
          <span className={cn("text-lg font-semibold tabular-nums", AREA.total)}>{iqd(usdToIqd(num(amount), num(rate)))}</span>
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
          {pending ? t("common.saving") : t("receipts.record")}
        </Button>
      </div>

      <PartyDialog
        key={table}
        table={table}
        open={newParty}
        onOpenChange={setNewParty}
        onSaved={(row) => {
          setParties((p) => ({ ...p, [kind]: [...p[kind], { id: row.id, name: row.name, phone: null, address: null, notes: null }] }))
          pickParty(row.id)
        }}
      />
    </form>
  )
}
