"use client"

import { ArrowDownLeft, ArrowUpRight, RefreshCw, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { saveReceipt } from "@/lib/actions/receipts"
import { today } from "@/lib/dates"
import { RECEIPT_METHODS, type OpenItem, type Party, type ReceiptKind, type ReceiptMethod } from "@/lib/data/types"
import { iqd, num, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { Field, NativeSelect } from "./form-bits"
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
}: {
  kind: ReceiptKind
  customers: Party[]
  suppliers: Party[]
  open: Record<ReceiptKind, OpenItem[]>
  numbers: Record<ReceiptKind, string>
  liveRate: number | null
}) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const [kind, setKind] = useState<ReceiptKind>(initialKind)
  const [parties, setParties] = useState({ in: initialCustomers, out: initialSuppliers })
  const [partyId, setPartyId] = useState(NONE)
  const [forKey, setForKey] = useState(NONE) // "invoice:<id>" | "debt:<id>" | ""
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today())
  const [rate, setRate] = useState(String(liveRate ?? ""))
  const [method, setMethod] = useState<ReceiptMethod>("cash")
  const [notes, setNotes] = useState("")
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
        saveReceipt({
          kind,
          date,
          party_id: partyId,
          amount_usd: num(amount),
          rate_per_100: num(rate),
          method,
          invoice_id: chosen?.type === "invoice" ? chosen.id : null,
          debt_id: chosen?.type === "debt" ? chosen.id : null,
          notes: notes || null,
        }),
      {
        then: (saved) => {
          toast.success(t("receipts.created", { number: numbers[kind] }))
          router.push(`/receipts/${saved.id}`)
        },
      },
    )
  }

  const table = kind === "in" ? "customers" : "suppliers"
  return (
    <form onSubmit={submit} className="mx-auto grid max-w-2xl gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("receipts.new")}</h2>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t(kind === "in" ? "receipts.from" : "receipts.to")}>
          <div className="flex gap-2">
            <NativeSelect value={partyId} onChange={(e) => pickParty(e.target.value)} required>
              <option value={NONE}>{t("receipts.choose")}</option>
              {parties[kind].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" variant="outline" size="icon" onClick={() => setNewParty(true)} aria-label={t(kind === "in" ? "receipts.customer" : "receipts.supplier")}>
              <UserPlus />
            </Button>
          </div>
        </Field>
        <Field label={t("common.date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("receipts.amount")}>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={chosen ? chosen.remaining : undefined}
            readOnly={chosen?.type === "invoice"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="text-end tabular-nums"
          />
        </Field>
        <Field label={t("receipts.method")}>
          <NativeSelect value={method} onChange={(e) => setMethod(e.target.value as ReceiptMethod)}>
            {RECEIPT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`receipts.methods.${m}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t("receipts.exchangeRate")}</span>
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
          <span className="font-medium">{t("receipts.amountIqd")}</span>
          <span className="text-lg font-semibold tabular-nums">{iqd(usdToIqd(num(amount), num(rate)))}</span>
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
