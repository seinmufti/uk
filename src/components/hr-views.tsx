"use client"

import { Check, CheckCheck, ChevronLeft, ChevronRight, Minus, Pencil, Plus, Undo2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/provider"
import {
  addAbsence,
  addLeave,
  deleteAbsence,
  deleteEmployee,
  deleteLeave,
  generatePayroll,
  setPayPeriod,
  setPayrollIncluded,
  saveEmployee,
  setPayrollPaid,
  payPayroll,
  payAllPayroll,
  deletePayrollItem,
  savePayrollItem,
} from "@/lib/actions/hr"
import { formatDate, periodRange, today } from "@/lib/dates"
import type { Absence, AmountCurrency, Employee, Leave, PayrollItem, PayrollRow } from "@/lib/data/types"
import { iqd, iqdToUsd, num, plain, round6, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { Amount } from "./amount"
import { DeleteButton } from "./delete-button"
import { Field, NativeSelect } from "./form-bits"
import { MoneyInput } from "./money-input"
import { useRate } from "./rate-provider"
import { NumberInput } from "./number-input"
import { PageHeader } from "./page-header"
import { PhoneInput } from "./phone-input"
import { FormDialog, useEditor } from "./form-dialog"
import { useAction } from "./use-action"

export function HrTabs() {
  const { t } = useI18n()
  const pathname = usePathname()
  const tabs = [
    { href: "/hr", label: t("hr.employees"), active: pathname !== "/hr/payroll" },
    { href: "/hr/payroll", label: t("hr.payroll"), active: pathname === "/hr/payroll" },
  ]
  return (
    <div className="inline-flex w-fit items-center rounded-lg bg-muted p-[3px] text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn("rounded-md px-3 py-1 text-muted-foreground hover:text-foreground", tab.active && "bg-background font-medium text-foreground shadow-sm")}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

// ---- Employee form ----

// salary_currency / salary_rate: what the salary was typed in, and the rate then (an IQD salary stays exact)
const blankEmployee = () => ({ name: "", position: "", phone: "", base_salary_usd: "", salary_currency: "usd" as AmountCurrency, salary_rate: null as number | null, start_date: today(), active: true, notes: "" })
const employeeForm = (e: Employee) => ({
  name: e.name,
  position: e.position ?? "",
  phone: e.phone ?? "",
  base_salary_usd: String(e.base_salary_usd),
  salary_currency: e.salary_currency ?? "usd",
  salary_rate: e.salary_rate,
  start_date: e.start_date,
  active: e.active,
  notes: e.notes ?? "",
})

function EmployeeDialog({ editor }: { editor: ReturnType<typeof useEditor<ReturnType<typeof blankEmployee>>> }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  const { form, set } = editor
  const todayRate = useRate()
  return (
    <FormDialog
      title={editor.id ? t("hr.editEmployee") : t("hr.newEmployee")}
      open={editor.open}
      onOpenChange={editor.setOpen}
      pending={pending}
      onSubmit={() =>
        run(() => saveEmployee(editor.id, { ...form, base_salary_usd: num(form.base_salary_usd), salary_rate: form.salary_rate || todayRate, position: form.position || null, phone: form.phone || null, notes: form.notes || null }), {
          success: t("common.saved"),
          then: () => editor.setOpen(false),
        })
      }
    >
      <Field label={t("common.name")}>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("hr.position")}>
          <Input value={form.position} onChange={(e) => set("position", e.target.value)} />
        </Field>
        <Field label={t("common.phone")}>
          <PhoneInput value={form.phone} onChange={(phone) => set("phone", phone)} />
        </Field>
        <Field label={t("hr.salary")}>
          <MoneyInput value={form.base_salary_usd} onChange={(e) => set("base_salary_usd", e.target.value)} currency={form.salary_currency} onCurrencyChange={(c) => set("salary_currency", c)} rate={form.salary_rate} required />
        </Field>
        <Field label={t("hr.startDate")}>
          <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
        </Field>
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={form.active} onCheckedChange={(v) => set("active", !!v)} />
        {t("hr.active")}
      </Label>
      <Field label={t("common.notes")}>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </Field>
    </FormDialog>
  )
}

// ---- Employees list ----

export function EmployeesView({ employees, highlight }: { employees: Employee[]; highlight?: string }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const editor = useEditor(blankEmployee)
  const todayRate = useRate()
  // Each currency added up on its own: USD salaries in USD, IQD salaries in IQD
  const active = employees.filter((e) => e.active)
  const payroll = {
    usd: round6(active.filter((e) => e.salary_currency !== "iqd").reduce((s, e) => s + e.base_salary_usd, 0)),
    iqd: active.filter((e) => e.salary_currency === "iqd").reduce((s, e) => s + Math.round(usdToIqd(e.base_salary_usd, e.salary_rate || todayRate || 0)), 0),
  }
  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("hr.title")}
        tabs={<HrTabs />}
        actions={
          <Button onClick={() => editor.openNew()}>
            <Plus /> {t("hr.newEmployee")}
          </Button>
        }
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("hr.position")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("hr.startDate")}</TableHead>
              <TableHead className="text-end">{t("hr.salary")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t("hr.emptyEmployees")}
                </TableCell>
              </TableRow>
            )}
            {employees.map((e) => (
              <TableRow
                key={e.id}
                ref={e.id === highlight ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
                className={cn("cursor-pointer", !e.active && "opacity-60", e.id === highlight && "bg-primary/15 ring-2 ring-primary ring-inset hover:bg-primary/20")}
                onClick={() => router.push(`/hr/${e.id}`)}
              >
                <TableCell className="font-medium">
                  {e.name}
                  {!e.active && (
                    <Badge variant="secondary" className="ms-2">
                      {t("hr.inactive")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{e.position || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(e.start_date, locale)}</TableCell>
                <TableCell className="text-end tabular-nums"><Amount usd={e.base_salary_usd} currency={e.salary_currency} rate={e.salary_rate} /></TableCell>
                <TableCell onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => editor.openEdit(e.id, employeeForm(e))}>
                      <Pencil />
                    </Button>
                    <DeleteButton action={() => deleteEmployee(e.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {employees.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="hidden md:table-cell">
                  {t("hr.totalSalaries")}
                </TableCell>
                <TableCell colSpan={2} className="hidden sm:table-cell md:hidden">
                  {t("hr.totalSalaries")}
                </TableCell>
                <TableCell className="sm:hidden">{t("hr.totalSalaries")}</TableCell>
                <TableCell className="text-end tabular-nums"><SplitAmount parts={payroll} /></TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      <EmployeeDialog editor={editor} />
    </div>
  )
}

// ---- One employee ----

const days = (from: string, to: string) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1

export function EmployeeDetail({ employee, leaves, absences }: { employee: Employee; leaves: Leave[]; absences: Absence[] }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const editor = useEditor(blankEmployee)
  const leave = useEditor(() => ({ from_date: today(), to_date: today(), type: "paid" as Leave["type"], notes: "" }))
  const absence = useEditor(() => ({ date: today(), days: "1", notes: "" }))

  return (
    <div className="grid gap-6">
      <PageHeader title={t("hr.title")} tabs={<HrTabs />} />
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
        <div>
          <div className="text-lg font-semibold">{employee.name}</div>
          <div className="text-sm text-muted-foreground">
            {[employee.position, employee.phone].filter(Boolean).join(" · ") || "—"}
          </div>
          <div className="mt-2 text-sm">
            {t("hr.salary")}: <span className="font-medium tabular-nums"><Amount usd={employee.base_salary_usd} currency={employee.salary_currency} rate={employee.salary_rate} /></span> · {t("hr.startDate")}: {formatDate(employee.start_date, locale)}
          </div>
          {employee.notes && <p className="mt-2 text-sm text-muted-foreground">{employee.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => editor.openEdit(employee.id, employeeForm(employee))}>
            <Pencil /> {t("common.edit")}
          </Button>
          <DeleteButton label action={() => deleteEmployee(employee.id)} then={() => router.push("/hr")} />
        </div>
      </div>

      <section className="grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{t("hr.leaves")}</h2>
          <Button size="sm" variant="outline" onClick={() => leave.openNew()}>
            <Plus /> {t("hr.addLeave")}
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableBody>
              {leaves.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 text-center text-muted-foreground">{t("common.noData")}</TableCell>
                </TableRow>
              )}
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    {formatDate(l.from_date, locale)} – {formatDate(l.to_date, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {days(l.from_date, l.to_date)} {t("hr.days").toLowerCase()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.type === "unpaid" ? "destructive" : "secondary"}>{t(`hr.leaveType.${l.type}`)}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{l.notes}</TableCell>
                  <TableCell className="w-10">
                    <DeleteButton action={() => deleteLeave(l.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{t("hr.absences")}</h2>
          <Button size="sm" variant="outline" onClick={() => absence.openNew()}>
            <Plus /> {t("hr.addAbsence")}
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableBody>
              {absences.length === 0 && (
                <TableRow>
                  <TableCell className="py-6 text-center text-muted-foreground">{t("common.noData")}</TableCell>
                </TableRow>
              )}
              {absences.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.date, locale)}</TableCell>
                  <TableCell className="tabular-nums">
                    {plain(a.days)} {t("hr.days").toLowerCase()}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{a.notes}</TableCell>
                  <TableCell className="w-10">
                    <DeleteButton action={() => deleteAbsence(a.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <EmployeeDialog editor={editor} />

      <FormDialog
        title={t("hr.addLeave")}
        open={leave.open}
        onOpenChange={leave.setOpen}
        pending={pending}
        onSubmit={() =>
          run(() => addLeave({ ...leave.form, employee_id: employee.id, notes: leave.form.notes || null }), { success: t("common.saved"), then: () => leave.setOpen(false) })
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.from")}>
            <Input type="date" value={leave.form.from_date} onChange={(e) => leave.set("from_date", e.target.value)} required />
          </Field>
          <Field label={t("common.to")}>
            <Input type="date" value={leave.form.to_date} onChange={(e) => leave.set("to_date", e.target.value)} required />
          </Field>
        </div>
        <Field label={t("common.type")}>
          <NativeSelect value={leave.form.type} onChange={(e) => leave.set("type", e.target.value as Leave["type"])}>
            {(["paid", "unpaid", "sick"] as const).map((type) => (
              <option key={type} value={type}>
                {t(`hr.leaveType.${type}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("common.notes")}>
          <Input value={leave.form.notes} onChange={(e) => leave.set("notes", e.target.value)} />
        </Field>
      </FormDialog>

      <FormDialog
        title={t("hr.addAbsence")}
        open={absence.open}
        onOpenChange={absence.setOpen}
        pending={pending}
        onSubmit={() =>
          run(() => addAbsence({ ...absence.form, days: num(absence.form.days), employee_id: employee.id, notes: absence.form.notes || null }), {
            success: t("common.saved"),
            then: () => absence.setOpen(false),
          })
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.date")}>
            <Input type="date" value={absence.form.date} onChange={(e) => absence.set("date", e.target.value)} required />
          </Field>
          <Field label={t("hr.days")}>
            <NumberInput  step="0.5" min="0.5" value={absence.form.days} onChange={(e) => absence.set("days", e.target.value)} required />
          </Field>
        </div>
        <Field label={t("common.notes")}>
          <Input value={absence.form.notes} onChange={(e) => absence.set("notes", e.target.value)} />
        </Field>
      </FormDialog>
    </div>
  )
}

// ---- Payroll ----

type ItemForm = { kind: PayrollItem["kind"]; amount: string; reason: string; currency: AmountCurrency; rate_per_100: number | null }
const blankItem = (): ItemForm => ({ kind: "bonus", amount: "", reason: "", currency: "usd", rate_per_100: null })

/** The entries added up per currency they were typed in: "$88.12 + 2,000 IQD" */
function ItemsTotal({ items }: { items: PayrollItem[] }) {
  const today = useRate()
  const inUsd = items.filter((i) => i.currency !== "iqd").reduce((s, i) => s + i.amount_usd, 0)
  const inIqd = items.filter((i) => i.currency === "iqd").reduce((s, i) => s + Math.round(usdToIqd(i.amount_usd, i.rate_per_100 || today || 0)), 0)
  const parts = [inUsd > 0.005 && usd(inUsd), inIqd > 0 && iqd(inIqd)].filter(Boolean)
  return (
    <bdi dir="ltr" className="tabular-nums">
      {parts.join(" + ")}
    </bdi>
  )
}

/** Each bonus / deduction under its total: what it was for and how much; click one to change it */
function Notes({ items, onEdit }: { items: PayrollItem[]; onEdit: (item: PayrollItem) => void }) {
  if (!items.length) return null
  return (
    <ul className="mt-0.5 grid justify-items-end text-xs font-normal text-muted-foreground">
      {items.map((i) => (
        <li key={i.id}>
          <button type="button" onClick={() => onEdit(i)} title={i.reason ?? undefined} className="-mx-1 flex max-w-56 items-baseline gap-1.5 rounded px-1 hover:bg-muted hover:text-foreground">
            {i.reason && <span className="truncate">{i.reason}</span>}
            <Amount usd={i.amount_usd} currency={i.currency} rate={i.rate_per_100} className="shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  )
}

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ar: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"],
  ckb: ["کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران", "تەممووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم"],
}

/** ‹ November 2026 ›: steps a month back or forward */
function MonthSwitch({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const { t, locale } = useI18n()
  const [y, m] = month.split("-").map(Number)
  const step = (by: number) => {
    const d = new Date(Date.UTC(y, m - 1 + by, 1))
    onChange(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  // Fixed names, not Intl: the server and the browser format months differently, which breaks hydration
  const label = `${(MONTHS[locale as keyof typeof MONTHS] ?? MONTHS.en)[m - 1]} ${y}`
  return (
    <div className="inline-flex items-center rounded-lg border bg-card" aria-label={t("hr.month")}>
      <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="‹">
        <ChevronLeft className="rtl:rotate-180" />
      </Button>
      <span className="min-w-36 px-2 text-center text-sm font-medium tabular-nums">{label}</span>
      <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="›">
        <ChevronRight className="rtl:rotate-180" />
      </Button>
    </div>
  )
}

/** A row's net pay kept in the currencies it's made of: the salary in its own currency, each bonus /
 * deduction in the one it was typed in. Nothing is converted to be added together. */
function netParts(row: PayrollRow, today: number | null) {
  const inIqd = (usdAmount: number, rate: number | null) => Math.round(usdToIqd(usdAmount, rate || today || 0))
  let usdPart = 0
  let iqdPart = 0
  if (row.currency === "iqd") iqdPart += inIqd(row.base_usd, row.rate_per_100)
  else usdPart += row.base_usd
  for (const i of row.items) {
    const sign = i.kind === "bonus" ? 1 : -1
    if (i.currency === "iqd") iqdPart += sign * inIqd(i.amount_usd, i.rate_per_100)
    else usdPart += sign * i.amount_usd
  }
  return { usd: round6(usdPart), iqd: iqdPart }
}

/** What to hand over for a net pay: its USD and IQD parts, a negative part taken off the other one */
function expectedPay(parts: { usd: number; iqd: number }, rate: number) {
  let { usd: u, iqd: q } = parts
  if (q < 0) {
    u = round6(u + iqdToUsd(q, rate))
    q = 0
  }
  if (u < 0) {
    q = Math.round(q + usdToIqd(u, rate))
    u = 0
  }
  return { usd: Math.max(0, round6(u)), iqd: Math.max(0, q) }
}

/** "$610.00 − 10,000 IQD", "$700.00", "400,000 IQD" */
function SplitAmount({ parts }: { parts: { usd: number; iqd: number } }) {
  const hasUsd = Math.abs(parts.usd) > 0.005
  const hasIqd = parts.iqd !== 0
  const text =
    hasUsd && hasIqd
      ? `${usd(parts.usd)} ${parts.iqd < 0 ? "−" : "+"} ${iqd(Math.abs(parts.iqd))}`
      : hasIqd
        ? iqd(parts.iqd)
        : usd(parts.usd)
  return (
    <bdi dir="ltr" className="tabular-nums">
      {text}
    </bdi>
  )
}

/** Net pay of several rows, each currency added up on its own */
function NetTotal({ rows }: { rows: PayrollRow[] }) {
  const today = useRate()
  const parts = rows.map((r) => netParts(r, today)).reduce((t, p) => ({ usd: t.usd + p.usd, iqd: t.iqd + p.iqd }), { usd: 0, iqd: 0 })
  return <SplitAmount parts={parts} />
}

/** One row's net pay, per currency */
function RowNet({ row }: { row: PayrollRow }) {
  const today = useRate()
  return <SplitAmount parts={netParts(row, today)} />
}

/** One employee's month: tick them in, add bonuses / deductions, pick the pay date. */
function PayrollLine({ row, onAdd, onEdit }: { row: PayrollRow; onAdd: (kind: PayrollItem["kind"]) => void; onEdit: (item: PayrollItem) => void }) {
  const { t, locale } = useI18n()
  const { pending, run } = useAction()
  const { from: monthStart, to: monthEnd } = periodRange("monthly", row.month)
  const from = row.period_from ?? monthStart
  const to = row.period_to ?? monthEnd
  return (
    <TableRow className={cn(!row.included && "text-muted-foreground")}>
      <TableCell className="w-8">
        <Checkbox
          checked={row.included}
          disabled={pending || !!row.paid_at}
          aria-label={t("hr.include")}
          title={t("hr.include")}
          onCheckedChange={(v) => run(() => setPayrollIncluded(row.id, !!v))}
        />
      </TableCell>
      <TableCell className="font-medium">
        <Link href={`/hr?highlight=${row.employee_id}`} className="hover:underline">
          {row.employee_name}
        </Link>
      </TableCell>
      <TableCell className="text-end">
        <Amount usd={row.base_usd} currency={row.currency} rate={row.rate_per_100} />
      </TableCell>
      <TableCell className="text-end text-red-700 dark:text-red-400">
        {row.deductions_usd > 0 ? <ItemsTotal items={row.items.filter((i) => i.kind === "deduction")} /> : "—"}
        <Notes items={row.items.filter((i) => i.kind === "deduction")} onEdit={onEdit} />
      </TableCell>
      <TableCell className="text-end text-emerald-700 dark:text-emerald-400">
        {row.bonuses_usd > 0 ? <ItemsTotal items={row.items.filter((i) => i.kind === "bonus")} /> : "—"}
        <Notes items={row.items.filter((i) => i.kind === "bonus")} onEdit={onEdit} />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          aria-label={t("common.from")}
          value={from}
          disabled={pending}
          onChange={(e) => e.target.value && run(() => setPayPeriod(row.id, e.target.value, to))}
          className="w-36"
        />
        {/* Only a warning: it can still be saved */}
        {row.hired && from < row.hired && <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t("hr.beforeHired", { date: formatDate(row.hired, locale) })}</div>}
      </TableCell>
      <TableCell>
        <Input
          type="date"
          aria-label={t("common.to")}
          value={to}
          disabled={pending}
          onChange={(e) => e.target.value && run(() => setPayPeriod(row.id, from, e.target.value))}
          className="w-36"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {/* + adds a bonus, − a deduction; click one under the total to change it */}
          <Button size="icon-sm" variant="ghost" className="text-emerald-600 dark:text-emerald-400" onClick={() => onAdd("bonus")} title={t("hr.addBonus")} aria-label={t("hr.addBonus")}>
            <Plus />
          </Button>
          <Button size="icon-sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => onAdd("deduction")} title={t("hr.addDeduction")} aria-label={t("hr.addDeduction")}>
            <Minus />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

/** This month's payroll: who's in, when they're paid, how much; pay from here. */
function PayrollSummary({ rows }: { rows: PayrollRow[] }) {
  const { t, locale } = useI18n()
  const { pending, run } = useAction()
  const unpaid = rows.filter((r) => !r.paid_at)
  const today = useRate()
  const rateOf = (r: PayrollRow) => (r.currency === "iqd" && r.rate_per_100) || today || 0
  // Paying one: what was handed over, in each currency, and a note
  const [paying, setPaying] = useState<PayrollRow | null>(null)
  const [pay, setPay] = useState({ usd: "", iqd: "", note: "" })
  const openPay = (r: PayrollRow) => {
    const e = expectedPay(netParts(r, today), rateOf(r))
    setPay({ usd: e.usd ? String(e.usd) : "", iqd: e.iqd ? String(e.iqd) : "", note: "" })
    setPaying(r)
  }
  return (
    <section className="grid gap-3 border-t pt-4">
      <h2 className="font-semibold">{t("hr.summary")}</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("hr.period")}</TableHead>
              <TableHead className="text-end">{t("hr.net")}</TableHead>
              <TableHead className="w-48 text-end">
                {unpaid.length > 0 && (
                  <Button size="sm" disabled={pending} onClick={() => run(() => payAllPayroll(unpaid.map((r) => ({ id: r.id, ...expectedPay(netParts(r, today), rateOf(r)), rate: rateOf(r) }))), { success: t("hr.allPaid") })}>
                    <CheckCheck /> {t("hr.markAllPaid")}
                  </Button>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  {t("hr.summaryEmpty")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link href={`/hr?highlight=${row.employee_id}`} className="hover:underline">
                    {row.employee_name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.period_from && row.period_to ? `${formatDate(row.period_from, locale)} → ${formatDate(row.period_to, locale)}` : "—"}</TableCell>
                <TableCell className="text-end font-semibold">
                  <RowNet row={row} />
                  {row.paid_at && (row.paid_usd != null || row.paid_iqd != null) && (
                    <div className="text-xs font-normal text-emerald-700 dark:text-emerald-400">
                      {t("hr.paidAmount")} <SplitAmount parts={{ usd: row.paid_usd ?? 0, iqd: row.paid_iqd ?? 0 }} />
                    </div>
                  )}
                  {row.paid_note && <div className="max-w-56 truncate text-xs font-normal text-muted-foreground" title={row.paid_note}>{row.paid_note}</div>}
                </TableCell>
                <TableCell className="text-end">
                  {row.paid_at ? (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setPayrollPaid(row.id, false))} title={t("hr.unpaid")}>
                      <Undo2 /> <span className="text-emerald-700 dark:text-emerald-400">{t("hr.paidOn", { date: formatDate(row.paid_at, locale) })}</span>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => openPay(row)}>
                      <Check /> {t("hr.markPaid")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{t("hr.totalNet")}</TableCell>
                <TableCell className="text-end font-semibold">
                  <NetTotal rows={rows} />
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Paying one person: how much in each currency, and a note */}
      <FormDialog
        title={`${t("hr.markPaid")}${paying ? ` · ${paying.employee_name}` : ""}`}
        open={!!paying}
        onOpenChange={(open) => !open && setPaying(null)}
        pending={pending}
        onSubmit={() =>
          paying &&
          run(() => payPayroll(paying.id, { usd: num(pay.usd), iqd: num(pay.iqd), rate: rateOf(paying), note: pay.note || null }), {
            success: t("common.saved"),
            then: () => setPaying(null),
          })
        }
      >
        {paying && (
          <p className="text-sm text-muted-foreground">
            {t("hr.net")}: <RowNet row={paying} />
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="USD">
            <NumberInput value={pay.usd} onChange={(e) => setPay({ ...pay, usd: e.target.value })} placeholder="0.00" className="text-end tabular-nums" autoFocus />
          </Field>
          <Field label="IQD">
            <NumberInput value={pay.iqd} onChange={(e) => setPay({ ...pay, iqd: e.target.value })} placeholder="0" className="text-end tabular-nums" />
          </Field>
        </div>
        <Field label={t("hr.reason")}>
          <Input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
        </Field>
      </FormDialog>
    </section>
  )
}

export function PayrollView({ month, rows, missing }: { month: string; rows: PayrollRow[]; missing: number }) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  // The month's rows are made for everyone without one, as soon as the month is opened (no button)
  const [made, setMade] = useState<string | null>(null)
  if (missing > 0 && made !== month) {
    setMade(month)
    queueMicrotask(() => run(() => generatePayroll(month)))
  }
  // The small bonus / deduction form: for which row, and which entry when changing one
  const [editing, setEditing] = useState<{ rowId: string; itemId: string | null } | null>(null)
  const [form, setForm] = useState<ItemForm>(blankItem)
  const todayRate = useRate()
  const editingRow = rows.find((r) => r.id === editing?.rowId)

  const openItem = (rowId: string, item?: PayrollItem, kind: PayrollItem["kind"] = "bonus") => {
    const row = rows.find((r) => r.id === rowId)
    setForm(
      item
        ? { kind: item.kind, amount: String(item.amount_usd), reason: item.reason ?? "", currency: item.currency, rate_per_100: item.rate_per_100 }
        : { ...blankItem(), kind, currency: row?.currency ?? "usd", rate_per_100: row?.rate_per_100 ?? null },
    )
    setEditing({ rowId, itemId: item?.id ?? null })
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={t("hr.title")}
        tabs={<HrTabs />}
        actions={
          <MonthSwitch month={month} onChange={(m) => router.push(`/hr/payroll?month=${m}`)} />
        }
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t("common.name")}</TableHead>
              <TableHead className="text-end">{t("hr.base")}</TableHead>
              <TableHead className="text-end">{t("hr.deductions")}</TableHead>
              <TableHead className="text-end">{t("hr.bonuses")}</TableHead>
              <TableHead>{t("common.from")}</TableHead>
              <TableHead>{t("common.to")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {pending ? "…" : t("hr.payrollEmpty")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <PayrollLine key={row.id} row={row} onAdd={(kind) => openItem(row.id, undefined, kind)} onEdit={(item) => openItem(row.id, item)} />
            ))}
          </TableBody>
        </Table>
      </div>

      <PayrollSummary rows={rows.filter((r) => r.included)} />

      {/* Add or change one bonus / deduction */}
      <FormDialog
        title={`${t(editing?.itemId ? "hr.editAdjustment" : "hr.addAdjustment")}${editingRow ? ` · ${editingRow.employee_name}` : ""}`}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        pending={pending}
        extra={editing?.itemId && <DeleteButton label action={() => deletePayrollItem(editing.itemId!)} then={() => setEditing(null)} />}
        onSubmit={() =>
          editing &&
          run(() => savePayrollItem(editing.rowId, editing.itemId, { kind: form.kind, amount_usd: num(form.amount), reason: form.reason || null, currency: form.currency, rate_per_100: form.rate_per_100 || todayRate }), {
            success: t("common.saved"),
            then: () => setEditing(null),
          })
        }
      >
        <div className="inline-flex w-fit rounded-lg border bg-card p-[3px] text-sm" role="radiogroup">
          {(["bonus", "deduction"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={form.kind === k}
              onClick={() => setForm({ ...form, kind: k })}
              className={cn("rounded-md px-3 py-1 font-medium", form.kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t(k === "bonus" ? "hr.bonus" : "hr.deduction")}
            </button>
          ))}
        </div>
        <Field label={t("common.amount")}>
          <MoneyInput value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} currency={form.currency} onCurrencyChange={(c) => setForm({ ...form, currency: c })} rate={form.rate_per_100} required autoFocus />
        </Field>
        <Field label={t("hr.reason")}>
          <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={t(form.kind === "bonus" ? "hr.reasonBonus" : "hr.reasonDeduction")} />
        </Field>
      </FormDialog>

    </div>
  )
}
