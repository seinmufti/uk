import { getSession } from "@/lib/auth"
import { db, must } from "@/lib/db"

const TABLES = [
  "settings", "customers", "suppliers", "invoices", "invoice_items", "purchases", "purchase_items", "inventory_items",
  "debts", "receipts", "expenses", "employees", "leaves", "absences", "payroll", "history_changes", "history",
]
const PAGE = 1000

/** Everything in the database as one JSON file. */
export async function GET() {
  if (!(await getSession())) return new Response("Sign in first", { status: 401 })
  const data: Record<string, unknown[]> = {}
  for (const table of TABLES) {
    const rows: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const page = must(await db().from(table).select("*").order("id").range(from, from + PAGE - 1))
      rows.push(...page)
      if (page.length < PAGE) break
    }
    data[table] = rows
  }
  const now = new Date().toISOString()
  return new Response(JSON.stringify({ app: "uk-accounting", exported_at: now, tables: data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="uk-backup-${now.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
