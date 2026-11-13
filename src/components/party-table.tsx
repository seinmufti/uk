"use client"

import { Pencil, Plus, Search } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/i18n/provider"
import { deleteParty } from "@/lib/actions/parties"
import type { Party } from "@/lib/data/types"
import { DeleteButton } from "./delete-button"
import { PageHeader } from "./page-header"
import { PartyDialog } from "./party-dialog"

/** The customers or suppliers page: a searchable table with add / edit / delete. */
export function PartyTable({ table, rows, extra }: { table: "customers" | "suppliers"; rows: Party[]; extra?: Record<string, string> }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Party | null>(null)
  const [open, setOpen] = useState(false)
  const isCustomer = table === "customers"
  const q = query.trim().toLowerCase()
  const shown = q ? rows.filter((r) => `${r.name} ${r.phone ?? ""} ${r.address ?? ""}`.toLowerCase().includes(q)) : rows

  const openFor = (party: Party | null) => {
    setEditing(party)
    setOpen(true)
  }

  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader
        title={t(isCustomer ? "customers.title" : "suppliers.title")}
        actions={
          <Button onClick={() => openFor(null)}>
            <Plus /> {t(isCustomer ? "customers.new" : "suppliers.new")}
          </Button>
        }
      />
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("common.search")} className="ps-8" />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("common.address")}</TableHead>
              {extra && <TableHead className="text-end">{t("customers.invoices")}</TableHead>}
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t(isCustomer ? "customers.empty" : "suppliers.empty")}
                </TableCell>
              </TableRow>
            )}
            {shown.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell dir="ltr" className="text-start">
                  {row.phone || "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{row.address || "—"}</TableCell>
                {extra && <TableCell className="text-end tabular-nums">{extra[row.id] ?? "—"}</TableCell>}
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openFor(row)} aria-label={t("common.edit")}>
                      <Pencil />
                    </Button>
                    <DeleteButton action={() => deleteParty(table, row.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PartyDialog table={table} open={open} onOpenChange={setOpen} party={editing} />
    </div>
  )
}
