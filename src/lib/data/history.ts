import "server-only"
import { db, must } from "@/lib/db"
import { docNumber } from "@/lib/money"

export type HistoryRow = {
  id: number
  tbl: string
  op: "INSERT" | "UPDATE" | "DELETE"
  row_id: string
  old_row: Record<string, unknown> | null
  new_row: Record<string, unknown> | null
}
export type Change = { id: string; at: string; undone: boolean; undone_at: string | null; rows: HistoryRow[] }

/** Parents first: re-created rows need their parents back; deleted rows go children first. */
export const TABLE_RANK: Record<string, number> = {
  customers: 0, suppliers: 0, employees: 0, settings: 0,
  invoices: 1, purchases: 1,
  invoice_items: 2, purchase_items: 2, inventory_items: 2, debts: 2, leaves: 2, absences: 2, payroll: 2,
  expenses: 3, receipts: 3,
}

export async function listChanges(limit = 150): Promise<Change[]> {
  const changes = must(await db().from("history_changes").select("*").order("at", { ascending: false }).limit(limit))
  if (!changes.length) return []
  const rows = must(
    await db()
      .from("history")
      .select("id, change_id, tbl, op, row_id, old_row, new_row")
      .in("change_id", changes.map((c) => c.id))
      .order("id"),
  )
  return changes.map((c) => ({ ...c, rows: rows.filter((r) => r.change_id === c.id) }))
}

export async function getChange(id: string): Promise<Change | null> {
  const change = must(await db().from("history_changes").select("*").eq("id", id).maybeSingle())
  if (!change) return null
  const rows = must(await db().from("history").select("id, tbl, op, row_id, old_row, new_row").eq("change_id", id).order("id"))
  return { ...change, rows }
}

// ---- Describing a change in words ----

const NOUN: Record<string, string> = {
  customers: "customer", suppliers: "supplier", employees: "employee", settings: "settings",
  invoices: "invoice", purchases: "purchase", invoice_items: "invoice line", purchase_items: "purchase line",
  inventory_items: "inventory item", debts: "debt", leaves: "leave", absences: "absence", payroll: "payroll",
  expenses: "expense", receipts: "receipt",
}
const VERB = { INSERT: "Added", UPDATE: "Changed", DELETE: "Deleted" } as const

function name(tbl: string, r: Record<string, unknown>): string {
  switch (tbl) {
    case "invoices":
    case "purchases":
      return docNumber(Number(r.number))
    case "receipts":
      return `${r.kind === "in" ? "R" : "P"}-${docNumber(Number(r.number))}`
    case "customers":
    case "suppliers":
    case "employees":
    case "inventory_items":
      return String(r.name ?? "")
    case "debts":
      return String(r.party ?? "")
    case "expenses":
    case "invoice_items":
    case "purchase_items":
      return String(r.description ?? "")
    case "payroll":
      return String(r.month ?? "").slice(0, 7)
    case "leaves":
      return `${r.from_date ?? ""} → ${r.to_date ?? ""}`
    case "absences":
      return String(r.date ?? "")
    default:
      return ""
  }
}

/** "Added invoice 0004", plus how many other rows the same action touched. */
export function describe(change: Change): { title: string; more: number } {
  if (!change.rows.length) return { title: "Change", more: 0 }
  // What the action was about: an added or deleted row says more than a side-effect update
  // (a receipt marks its invoice paid; the receipt is the news)
  const weight = (r: HistoryRow) => (r.op === "UPDATE" ? 10 : 0) + (TABLE_RANK[r.tbl] ?? 9) - (r.op === "UPDATE" ? 0 : r.tbl.endsWith("_items") ? -5 : 0)
  const main = [...change.rows].sort((a, b) => weight(a) - weight(b) || a.id - b.id)[0]
  const row = main.new_row ?? main.old_row ?? {}
  const label = name(main.tbl, row)
  const title = `${VERB[main.op]} ${NOUN[main.tbl] ?? main.tbl}${label ? ` ${label}` : ""}`
  return { title, more: change.rows.length - 1 }
}
