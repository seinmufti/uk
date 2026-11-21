import { getSession, IS_DEMO } from "@/lib/auth"
import { DB_SCHEMA, db, must } from "@/lib/db"

/** Every table the app keeps, parents before the rows that point at them (the order a restore needs). */
const TABLES = [
  "settings",
  "customers",
  "suppliers",
  "employees",
  "invoices",
  "invoice_items",
  "purchases",
  "purchase_items",
  "inventory_items",
  "debts",
  "receipts",
  "payroll",
  "payroll_items",
  "expenses",
  "leaves",
  "absences",
  "history_changes",
  "history",
]
const PAGE = 1000

async function allRows(table: string, columns = "*") {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const page = must(await db().from(table).select(columns).order("id").range(from, from + PAGE - 1))
    rows.push(...page)
    if (page.length < PAGE) break
  }
  return rows
}

/**
 * Everything this deployment holds (live or demo: each has its own data) as one JSON file. Accounts are
 * included for admins on the live app, without their passwords.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return new Response("Sign in first", { status: 401 })
  const tables: Record<string, unknown[]> = {}
  for (const table of TABLES) tables[table] = await allRows(table)
  if (!IS_DEMO && session.admin) tables.users = await allRows("users", "id, username, email, status, is_admin, created_at")

  const now = new Date().toISOString()
  const site = IS_DEMO ? "demo" : "live"
  const counts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]))
  return new Response(JSON.stringify({ app: "uk-accounting", site, schema: DB_SCHEMA, exported_at: now, exported_by: session.username, counts, tables }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="uk-backup-${site}-${now.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
