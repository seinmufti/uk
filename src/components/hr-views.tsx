"use client"

import { Check, Pencil, Plus, Undo2, Wand2 } from "lucide-react"
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
  deletePayroll,
  generatePayroll,
  saveEmployee,
  setPayrollPaid,
  updatePayroll,
} from "@/lib/actions/hr"
import { formatDate, today } from "@/lib/dates"
import type { Absence, Employee, Leave, PayrollRow } from "@/lib/data/types"
import { num, plain, round2, usd } from "@/lib/money"
import { cn } from "@/lib/utils"
import { DeleteButton } from "./delete-button"
import { Field, NativeSelect } from "./form-bits"
import { NumberInput } from "./number-input"
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

const blankEmployee = () => ({ name: "", position: "", phone: "", base_salary_usd: "", start_date: today(), active: true, notes: "" })
const employeeForm = (e: Employee) => ({
  name: e.name,
  position: e.position ?? "",
  phone: e.phone ?? "",
  base_salary_usd: String(e.base_salary_usd),
  start_date: e.start_date,
  active: e.active,
  notes: e.notes ?? "",
})

function EmployeeDialog({ editor }: { editor: ReturnType<typeof useEditor<ReturnType<typeof blankEmployee>>> }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  const { form, set } = editor
  return (
    <FormDialog
      title={editor.id ? t("hr.editEmployee") : t("hr.newEmployee")}
      open={editor.open}
      onOpenChange={editor.setOpen}
      pending={pending}
      onSubmit={() =>
        run(() => saveEmployee(editor.id, { ...form, base_salary_usd: num(form.base_salary_usd), position: form.position || null, phone: form.phone || null, notes: form.notes || null }), {
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
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" type="tel" placeholder="+964" />
        </Field>
        <Field label={t("hr.salary")}>
          <NumberInput  step="0.01" min="0" value={form.base_salary_usd} onChange={(e) => set("base_salary_usd", e.target.value)} required />
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

export function EmployeesView({ employees }: { employees: Employee[] }) {
  const { t } = useI18n()
  const router = useRouter()
  const editor = useEditor(blankEmployee)
  const payroll = employees.filter((e) => e.active).reduce((s, e) => s + e.base_salary_usd, 0)
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => editor.openNew()}>
          <Plus /> {t("hr.newEmployee")}
        </Button>
      </div>
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
              <TableRow key={e.id} className={cn("cursor-pointer", !e.active && "opacity-60")} onClick={() => router.push(`/hr/${e.id}`)}>
                <TableCell className="font-medium">
                  {e.name}
                  {!e.active && (
                    <Badge variant="secondary" className="ms-2">
                      {t("hr.inactive")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{e.position || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(e.start_date)}</TableCell>
                <TableCell className="text-end tabular-nums">{usd(e.base_salary_usd)}</TableCell>
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
                  {t("hr.totalNet")}
                </TableCell>
                <TableCell colSpan={2} className="hidden sm:table-cell md:hidden">
                  {t("hr.totalNet")}
                </TableCell>
                <TableCell className="sm:hidden">{t("hr.totalNet")}</TableCell>
                <TableCell className="text-end tabular-nums">{usd(payroll)}</TableCell>
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
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const editor = useEditor(blankEmployee)
  const leave = useEditor(() => ({ from_date: today(), to_date: today(), type: "paid" as Leave["type"], notes: "" }))
  const absence = useEditor(() => ({ date: today(), days: "1", notes: "" }))

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
        <div>
          <div className="text-lg font-semibold">{employee.name}</div>
          <div className="text-sm text-muted-foreground">
            {[employee.position, employee.phone].filter(Boolean).join(" · ") || "—"}
          </div>
          <div className="mt-2 text-sm">
            {t("hr.salary")}: <span className="font-medium tabular-nums">{usd(employee.base_salary_usd)}</span> · {t("hr.startDate")}: {formatDate(employee.start_date)}
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
                    {formatDate(l.from_date)} – {formatDate(l.to_date)}
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
                  <TableCell>{formatDate(a.date)}</TableCell>
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

function PayrollLine({ row }: { row: PayrollRow }) {
  const { t } = useI18n()
  const { pending, run } = useAction()
  const [deductions, setDeductions] = useState(String(row.deductions_usd))
  const [bonuses, setBonuses] = useState(String(row.bonuses_usd))
  const net = round2(row.base_usd - num(deductions) + num(bonuses))
  const dirty = num(deductions) !== row.deductions_usd || num(bonuses) !== row.bonuses_usd
  const save = () => dirty && run(() => updatePayroll(row.id, { deductions_usd: num(deductions), bonuses_usd: num(bonuses) }))

  return (
    <TableRow>
      <TableCell className="font-medium">{row.employee_name}</TableCell>
      <TableCell className="text-end tabular-nums">{usd(row.base_usd)}</TableCell>
      <TableCell className="text-end">
        <NumberInput  step="0.01" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} onBlur={save} className="ms-auto w-24 text-end" />
      </TableCell>
      <TableCell className="text-end">
        <NumberInput  step="0.01" min="0" value={bonuses} onChange={(e) => setBonuses(e.target.value)} onBlur={save} className="ms-auto w-24 text-end" />
      </TableCell>
      <TableCell className="text-end font-semibold tabular-nums">{usd(net)}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {row.paid_at ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setPayrollPaid(row.id, false))} title={t("hr.unpaid")}>
              <Undo2 /> <span className="text-emerald-700 dark:text-emerald-400">{t("hr.paidOn", { date: formatDate(row.paid_at) })}</span>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={pending || dirty} onClick={() => run(() => setPayrollPaid(row.id, true))}>
              <Check /> {t("hr.markPaid")}
            </Button>
          )}
          {!row.paid_at && <DeleteButton action={() => deletePayroll(row.id)} />}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function PayrollView({ month, rows }: { month: string; rows: PayrollRow[] }) {
  const { t } = useI18n()
  const router = useRouter()
  const { pending, run } = useAction()
  const total = rows.reduce((s, r) => s + r.base_usd - r.deductions_usd + r.bonuses_usd, 0)
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("hr.month")}>
          <Input type="month" value={month.slice(0, 7)} onChange={(e) => e.target.value && router.push(`/hr/payroll?month=${e.target.value}`)} className="w-44" />
        </Field>
        <Button disabled={pending} onClick={() => run(() => generatePayroll(month), { success: t("hr.generated") })}>
          <Wand2 /> {t("hr.generate")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("hr.deductionHint")}</p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead className="text-end">{t("hr.base")}</TableHead>
              <TableHead className="text-end">{t("hr.deductions")}</TableHead>
              <TableHead className="text-end">{t("hr.bonuses")}</TableHead>
              <TableHead className="text-end">{t("hr.net")}</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("hr.payrollEmpty")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <PayrollLine key={`${row.id}-${row.deductions_usd}-${row.bonuses_usd}`} row={row} />
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>{t("hr.totalNet")}</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{usd(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  )
}
