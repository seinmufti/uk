"use client"

import { Copy, Pencil, Plus, Repeat } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/i18n/provider"
import { deleteExpense, saveExpense } from "@/lib/actions/records"
import { formatDate, today } from "@/lib/dates"
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from "@/lib/data/types"
import { num, usd } from "@/lib/money"
import { DeleteButton } from "./delete-button"
import { Field, NativeSelect } from "./form-bits"
import { FormDialog, useEditor } from "./form-dialog"
import { PageHeader } from "./page-header"
import { useAction } from "./use-action"

const blank = () => ({ date: today(), category: "other" as ExpenseCategory, description: "", amount_usd: "", recurring: false })

export function ExpensesView({ expenses, from, to, category }: { expenses: Expense[]; from: string; to: string; category: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const editor = useEditor(blank)
  const { form, set } = editor
  const total = expenses.reduce((s, e) => s + e.amount_usd, 0)

  const filter = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ from, to, category, ...patch })
    if (!params.get("category")) params.delete("category")
    router.push(`/expenses?${params}`)
  }

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle")}
        actions={
          <Button onClick={() => editor.openNew()}>
            <Plus /> {t("expenses.new")}
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("common.from")}>
          <Input type="date" value={from} onChange={(e) => e.target.value && filter({ from: e.target.value })} className="w-40" />
        </Field>
        <Field label={t("common.to")}>
          <Input type="date" value={to} onChange={(e) => e.target.value && filter({ to: e.target.value })} className="w-40" />
        </Field>
        <Field label={t("common.category")}>
          <NativeSelect value={category} onChange={(e) => filter({ category: e.target.value })} className="w-44">
            <option value="">{t("common.all")}</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`expenses.categories.${c}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="ms-auto rounded-lg border px-3 py-1.5 text-end">
          <div className="text-xs text-muted-foreground">{t("expenses.totalInRange")}</div>
          <div className="font-semibold tabular-nums">{usd(total)}</div>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("common.category")}</TableHead>
              <TableHead className="text-end">{t("common.amount")}</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t("expenses.empty")}
                </TableCell>
              </TableRow>
            )}
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                <TableCell>
                  <span className="font-medium">{e.description}</span>
                  {e.recurring && (
                    <Badge variant="secondary" className="ms-2 gap-1">
                      <Repeat className="size-3" /> {t("expenses.recurringShort")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{t.dynamic(`expenses.categories.${e.category}`, e.category)}</TableCell>
                <TableCell className="text-end tabular-nums">{usd(e.amount_usd)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {/* Running costs: add this month's copy in one click */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t("common.add")}
                      aria-label={t("common.add")}
                      onClick={() => editor.openNew({ category: e.category, description: e.description, amount_usd: String(e.amount_usd), recurring: e.recurring })}
                    >
                      <Copy />
                    </Button>
                    {!e.payroll_id && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("common.edit")}
                        onClick={() =>
                          editor.openEdit(e.id, { date: e.date, category: e.category, description: e.description, amount_usd: String(e.amount_usd), recurring: e.recurring })
                        }
                      >
                        <Pencil />
                      </Button>
                    )}
                    <DeleteButton action={() => deleteExpense(e.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {expenses.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{t("common.total")}</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{usd(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <FormDialog
        title={editor.id ? t("expenses.edit") : t("expenses.new")}
        open={editor.open}
        onOpenChange={editor.setOpen}
        pending={pending}
        onSubmit={() =>
          run(() => saveExpense(editor.id, { ...form, amount_usd: num(form.amount_usd) }), {
            success: t("common.saved"),
            then: () => editor.setOpen(false),
          })
        }
      >
        <Field label={t("common.description")}>
          <Input value={form.description} onChange={(e) => set("description", e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.category")}>
            <NativeSelect value={form.category} onChange={(e) => set("category", e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.categories.${c}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={`${t("common.amount")} (USD)`}>
            <Input type="number" step="0.01" min="0" value={form.amount_usd} onChange={(e) => set("amount_usd", e.target.value)} required />
          </Field>
        </div>
        <Field label={t("common.date")}>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </Field>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={form.recurring} onCheckedChange={(v) => set("recurring", !!v)} />
          {t("expenses.recurring")}
        </Label>
      </FormDialog>
    </div>
  )
}
