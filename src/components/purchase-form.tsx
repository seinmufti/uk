"use client"

import { Plus, Trash2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { savePurchase } from "@/lib/actions/purchases"
import { today } from "@/lib/dates"
import type { Party, Purchase } from "@/lib/data/types"
import { docNumber, num, round2, usd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { Field, NativeSelect } from "./form-bits"
import { PartyDialog } from "./party-dialog"
import { useAction } from "./use-action"

type Row = { key: number; description: string; qty: string; unit_cost_usd: string }
let nextKey = 1
const blankRow = (): Row => ({ key: nextKey++, description: "", qty: "1", unit_cost_usd: "" })

export function PurchaseForm({ suppliers: initialSuppliers, purchase, number }: { suppliers: Party[]; purchase?: Purchase | null; number: number }) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id ?? "")
  const [date, setDate] = useState(purchase?.date ?? today())
  const [payment, setPayment] = useState<"paid" | "debt">(purchase?.payment_status ?? "paid")
  const [amountPaid, setAmountPaid] = useState(purchase?.payment_status === "debt" ? String(purchase.amount_paid_usd) : "0")
  const [notes, setNotes] = useState(purchase?.notes ?? "")
  const [rows, setRows] = useState<Row[]>(
    purchase?.items.length
      ? purchase.items.map((i) => ({ key: nextKey++, description: i.description, qty: String(i.qty), unit_cost_usd: String(i.unit_cost_usd) }))
      : [blankRow()],
  )
  const [newSupplier, setNewSupplier] = useState(false)

  const total = round2(rows.reduce((s, r) => s + num(r.qty) * num(r.unit_cost_usd), 0))
  const owed = payment === "debt" ? Math.max(0, round2(total - num(amountPaid))) : 0
  const update = (key: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    run(
      () =>
        savePurchase(purchase?.id ?? null, {
          date,
          supplier_id: supplierId || null,
          payment_status: payment,
          amount_paid_usd: num(amountPaid),
          notes: notes || null,
          items: rows.map((r) => ({ description: r.description, qty: num(r.qty), unit_cost_usd: num(r.unit_cost_usd) })),
        }),
      {
        then: (saved) => {
          toast.success(purchase ? t("common.saved") : t("purchases.created", { number: docNumber(saved.number) }))
          router.push(`/purchases/${saved.id}`)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{purchase ? t("purchases.edit") : t("purchases.new")}</h2>
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm tabular-nums">#{docNumber(purchase?.number ?? number)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("purchases.supplier")}>
          <div className="flex gap-2">
            <NativeSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{t("purchases.noSupplier")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="button" variant="outline" size="icon" onClick={() => setNewSupplier(true)} aria-label={t("purchases.newSupplier")} title={t("purchases.newSupplier")}>
              <UserPlus />
            </Button>
          </div>
        </Field>
        <Field label={t("common.date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[1fr_5rem_7rem_7rem_2rem] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
          <span>{t("common.description")}</span>
          <span>{t("common.qty")}</span>
          <span>{t("purchases.unitCost")}</span>
          <span className="text-end">{t("common.total")}</span>
          <span />
        </div>
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_4rem_6rem_2rem] items-center gap-2 border-b px-3 py-2 sm:grid-cols-[1fr_5rem_7rem_7rem_2rem]">
            <Input value={row.description} onChange={(e) => update(row.key, { description: e.target.value })} placeholder={t("common.description")} />
            <Input type="number" step="any" min="0" value={row.qty} onChange={(e) => update(row.key, { qty: e.target.value })} aria-label={t("common.qty")} />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={row.unit_cost_usd}
              onChange={(e) => update(row.key, { unit_cost_usd: e.target.value })}
              placeholder="0.00"
              aria-label={t("purchases.unitCost")}
              className="text-end tabular-nums"
            />
            <span className="hidden text-end text-sm tabular-nums sm:block">{usd(num(row.qty) * num(row.unit_cost_usd))}</span>
            <Button type="button" variant="ghost" size="icon-sm" disabled={rows.length === 1} onClick={() => setRows(rows.filter((r) => r.key !== row.key))} aria-label={t("common.delete")}>
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
            <span className="font-semibold tabular-nums">{usd(total)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <div className="text-sm font-medium">{t("purchases.payment")}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["paid", "debt"] as const).map((value) => (
            <label
              key={value}
              className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm", payment === value && "border-primary bg-muted/50")}
            >
              <input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} />
              {t(value === "paid" ? "purchases.payment_paid" : "purchases.payment_debt")}
            </label>
          ))}
        </div>
        {payment === "debt" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("purchases.amountPaid")}>
              <Input type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </Field>
            <div className="flex items-end justify-between rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>{t("purchases.owed")}</span>
              <span className="font-semibold tabular-nums">{usd(owed)}</span>
            </div>
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
        table="suppliers"
        open={newSupplier}
        onOpenChange={setNewSupplier}
        onSaved={(s) => {
          setSuppliers([...suppliers, { id: s.id, name: s.name, phone: null, address: null, notes: null }].sort((a, b) => a.name.localeCompare(b.name)))
          setSupplierId(s.id)
        }}
      />
    </form>
  )
}
