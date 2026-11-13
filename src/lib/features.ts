// Which sections a deployment shows. The official app (/uk) starts with invoices only; the demo shows all.
// Set NEXT_PUBLIC_UK_FEATURES on the Vercel project, e.g. "invoices" or "invoices,receipts,customers";
// leave it unset (or "all") for everything. Both deployments run the same code.

export const FEATURES = ["invoices", "receipts", "purchases", "expenses", "debts", "reports", "customers", "suppliers", "inventory", "hr"] as const
export type Feature = (typeof FEATURES)[number]

const setting = (process.env.NEXT_PUBLIC_UK_FEATURES ?? "all").trim()
const on = new Set(setting === "all" || !setting ? FEATURES : setting.split(",").map((s) => s.trim()))

export const isEnabled = (feature: Feature) => on.has(feature)

/** The section a path belongs to ("/invoices/123" → "invoices"), or null for pages that are always there. */
export function featureOf(pathname: string): Feature | null {
  const first = pathname.split("/")[1] as Feature
  return FEATURES.includes(first) ? first : null
}
