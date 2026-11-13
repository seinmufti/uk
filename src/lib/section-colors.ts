/** Each section has its own colour, used on its homepage tile and its page header. */
export type SectionColor = { icon: string; bar: string; tint: string; tile: string }

const c = (icon: string, bar: string, tint: string, tile: string): SectionColor => ({ icon, bar, tint, tile })

export const SECTION_COLORS: Record<string, SectionColor> = {
  invoices: c("bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", "bg-blue-500", "bg-blue-100 dark:bg-blue-950", "hover:border-blue-300 dark:hover:border-blue-700 border-s-blue-500"),
  receipts: c("bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", "bg-emerald-500", "bg-emerald-100 dark:bg-emerald-950", "hover:border-emerald-300 dark:hover:border-emerald-700 border-s-emerald-500"),
  purchases: c("bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", "bg-orange-500", "bg-orange-100 dark:bg-orange-950", "hover:border-orange-300 dark:hover:border-orange-700 border-s-orange-500"),
  expenses: c("bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", "bg-rose-500", "bg-rose-100 dark:bg-rose-950", "hover:border-rose-300 dark:hover:border-rose-700 border-s-rose-500"),
  debts: c("bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", "bg-amber-500", "bg-amber-100 dark:bg-amber-950", "hover:border-amber-300 dark:hover:border-amber-700 border-s-amber-500"),
  reports: c("bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", "bg-violet-500", "bg-violet-100 dark:bg-violet-950", "hover:border-violet-300 dark:hover:border-violet-700 border-s-violet-500"),
  customers: c("bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300", "bg-sky-500", "bg-sky-100 dark:bg-sky-950", "hover:border-sky-300 dark:hover:border-sky-700 border-s-sky-500"),
  suppliers: c("bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300", "bg-teal-500", "bg-teal-100 dark:bg-teal-950", "hover:border-teal-300 dark:hover:border-teal-700 border-s-teal-500"),
  asset: c("bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300", "bg-indigo-500", "bg-indigo-100 dark:bg-indigo-950", "hover:border-indigo-300 dark:hover:border-indigo-700 border-s-indigo-500"),
  stock: c("bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300", "bg-lime-500", "bg-lime-100 dark:bg-lime-950", "hover:border-lime-300 dark:hover:border-lime-700 border-s-lime-500"),
  capital: c("bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300", "bg-green-500", "bg-green-100 dark:bg-green-950", "hover:border-green-300 dark:hover:border-green-700 border-s-green-500"),
  inventory: c("bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300", "bg-indigo-500", "bg-indigo-100 dark:bg-indigo-950", "hover:border-indigo-300 dark:hover:border-indigo-700 border-s-indigo-500"),
  hr: c("bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300", "bg-pink-500", "bg-pink-100 dark:bg-pink-950", "hover:border-pink-300 dark:hover:border-pink-700 border-s-pink-500"),
  payroll: c("bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300", "bg-fuchsia-500", "bg-fuchsia-100 dark:bg-fuchsia-950", "hover:border-fuchsia-300 dark:hover:border-fuchsia-700 border-s-fuchsia-500"),
  history: c("bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300", "bg-slate-500", "bg-slate-200 dark:bg-slate-900", "hover:border-slate-300 dark:hover:border-slate-700 border-s-slate-500"),
}

/** "/invoices/123" → invoices colours; "/hr/payroll" → payroll; "/inventory?tab=stock" → stock. */
export function sectionColor(href: string): SectionColor | undefined {
  const [path, query] = href.split("?")
  const parts = path.split("/").filter(Boolean)
  const tab = new URLSearchParams(query ?? "").get("tab")
  if (parts[0] === "inventory" && tab) return SECTION_COLORS[tab]
  if (parts[0] === "hr" && parts[1] === "payroll") return SECTION_COLORS.payroll
  return SECTION_COLORS[parts[0] ?? ""]
}
