"use client"

import { Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import { deleteInventoryItem, saveInventoryItem } from "@/lib/actions/records"
import { formatDate, today } from "@/lib/dates"
import { INVENTORY_KINDS, type InventoryItem, type InventoryKind } from "@/lib/data/types"
import { num, plain, usd } from "@/lib/money"
import { DeleteButton } from "./delete-button"
import { Field, NativeSelect } from "./form-bits"
import { NumberInput } from "./number-input"
import { FormDialog, useEditor } from "./form-dialog"
import { LinkTabs } from "./link-tabs"
import { PageHeader } from "./page-header"
import { useAction } from "./use-action"

const blank = () => ({ kind: "stock" as InventoryKind, name: "", qty: "1", value_usd: "", date: today(), notes: "" })

export function InventoryView({ kind, items, totals }: { kind: InventoryKind; items: InventoryItem[]; totals: Record<InventoryKind, number> }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  const editor = useEditor(blank)
  const { form, set } = editor
  const total = items.reduce((s, i) => s + i.value_usd, 0)

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader
        title={t("inventory.title")}
        subtitle={t("inventory.subtitle")}
        actions={
          <Button onClick={() => editor.openNew({ kind })}>
            <Plus /> {t("inventory.new")}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {INVENTORY_KINDS.map((k) => (
          <Link key={k} href={`/inventory?tab=${k}`} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
            <div className="text-xs text-muted-foreground">{t(`inventory.kind.${k}`)}</div>
            <div className="text-lg font-semibold tabular-nums">{usd(totals[k])}</div>
          </Link>
        ))}
      </div>
      <LinkTabs active={kind} tabs={INVENTORY_KINDS.map((k) => ({ value: k, href: `/inventory?tab=${k}`, label: t(`inventory.kind.${k}`) }))} />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead className="text-end">{t("common.qty")}</TableHead>
              <TableHead className="text-end">{t("inventory.value")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("common.date")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("common.notes")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("inventory.empty")}
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-end tabular-nums">{plain(item.qty, 3)}</TableCell>
                <TableCell className="text-end tabular-nums">{usd(item.value_usd)}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(item.date)}</TableCell>
                <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                  {item.source_purchase_id ? (
                    <Link href={`/purchases/${item.source_purchase_id}`} className="underline-offset-4 hover:underline">
                      {t("nav.purchases")}
                    </Link>
                  ) : (
                    item.notes
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("common.edit")}
                      onClick={() =>
                        editor.openEdit(item.id, { kind: item.kind, name: item.name, qty: String(item.qty), value_usd: String(item.value_usd), date: item.date, notes: item.notes ?? "" })
                      }
                    >
                      <Pencil />
                    </Button>
                    <DeleteButton action={() => deleteInventoryItem(item.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {items.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{t("inventory.totalValue")}</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{usd(total)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <FormDialog
        title={editor.id ? t("inventory.edit") : t("inventory.new")}
        open={editor.open}
        onOpenChange={editor.setOpen}
        pending={pending}
        onSubmit={() =>
          run(() => saveInventoryItem(editor.id, { ...form, qty: num(form.qty), value_usd: num(form.value_usd), notes: form.notes || null }), {
            success: t("common.saved"),
            then: () => editor.setOpen(false),
          })
        }
      >
        <Field label={t("common.type")}>
          <NativeSelect value={form.kind} onChange={(e) => set("kind", e.target.value as InventoryKind)}>
            {INVENTORY_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`inventory.kindOne.${k}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("common.name")}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.qty")}>
            <NumberInput  step="any" min="0" value={form.qty} onChange={(e) => set("qty", e.target.value)} />
          </Field>
          <Field label={t("inventory.value")}>
            <NumberInput  step="0.01" value={form.value_usd} onChange={(e) => set("value_usd", e.target.value)} required />
          </Field>
        </div>
        <Field label={t("common.date")}>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </Field>
        <Field label={t("common.notes")}>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </Field>
      </FormDialog>
    </div>
  )
}
