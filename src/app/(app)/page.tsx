import { ArrowLeftRight, BarChart3, Banknote, Building2, CalendarCheck, FileText, HandCoins, Package, Receipt, ShoppingCart, Truck, Users, UserSquare2 } from "lucide-react"
import Link from "next/link"
import { getT } from "@/i18n/server"
import type { MessageKey } from "@/i18n/types"
import { featureOf, isEnabled } from "@/lib/features"
import { cn } from "@/lib/utils"

type Tile = { href: string; label: MessageKey; desc: MessageKey; icon: typeof FileText }

/** One colour per column: tile stripe, icon and column title. */
const COLORS = {
  finance: { title: "text-amber-600 dark:text-amber-400", tile: "border-s-amber-500 hover:border-amber-300 dark:hover:border-amber-700", icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  contacts: { title: "text-sky-600 dark:text-sky-400", tile: "border-s-sky-500 hover:border-sky-300 dark:hover:border-sky-700", icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  assets: { title: "text-emerald-600 dark:text-emerald-400", tile: "border-s-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  hr: { title: "text-violet-600 dark:text-violet-400", tile: "border-s-violet-500 hover:border-violet-300 dark:hover:border-violet-700", icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
}

const GROUPS: { title: MessageKey; color: keyof typeof COLORS; tiles: Tile[] }[] = [
  {
    title: "home.group.finance",
    color: "finance",
    tiles: [
      { href: "/invoices", label: "nav.invoices", desc: "home.desc.invoices", icon: FileText },
      { href: "/receipts", label: "nav.receipts", desc: "home.desc.receipts", icon: ArrowLeftRight },
      { href: "/purchases", label: "nav.purchases", desc: "home.desc.purchases", icon: ShoppingCart },
      { href: "/expenses", label: "nav.expenses", desc: "home.desc.expenses", icon: Receipt },
      { href: "/debts", label: "nav.debts", desc: "home.desc.debts", icon: HandCoins },
      { href: "/reports", label: "nav.reports", desc: "home.desc.reports", icon: BarChart3 },
    ],
  },
  {
    title: "home.group.contacts",
    color: "contacts",
    tiles: [
      { href: "/customers", label: "nav.customers", desc: "home.desc.customers", icon: Users },
      { href: "/suppliers", label: "nav.suppliers", desc: "home.desc.suppliers", icon: Truck },
    ],
  },
  {
    title: "home.group.assets",
    color: "assets",
    tiles: [
      { href: "/inventory?tab=asset", label: "inventory.kind.asset", desc: "home.desc.asset", icon: Building2 },
      { href: "/inventory?tab=stock", label: "inventory.kind.stock", desc: "home.desc.stock", icon: Package },
      { href: "/inventory?tab=capital", label: "inventory.kind.capital", desc: "home.desc.capital", icon: Banknote },
    ],
  },
  {
    title: "home.group.hr",
    color: "hr",
    tiles: [
      { href: "/hr", label: "hr.employees", desc: "home.desc.employees", icon: UserSquare2 },
      { href: "/hr/payroll", label: "hr.payroll", desc: "home.desc.payroll", icon: CalendarCheck },
    ],
  },
]

/** The homepage: every section as a tile, grouped in columns. */
export default async function HomePage() {
  const t = await getT()
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 sm:grid-cols-2 md:p-8 lg:grid-cols-4">
      {GROUPS.map((g) => ({ ...g, tiles: g.tiles.filter((tile) => { const f = featureOf(tile.href.split("?")[0]); return !f || isEnabled(f) }) }))
        .filter((g) => g.tiles.length > 0)
        .map((g) => (
        <section key={g.title} className="grid min-w-0 content-start gap-2">
          <h2 className={cn("px-1 text-xs font-semibold tracking-wide uppercase", COLORS[g.color].title)}>{t(g.title)}</h2>
          {g.tiles.map(({ href, label, desc, icon: Icon }) => (
            <Link
              prefetch={false}
              key={href}
              href={href}
              className={cn("group flex min-w-0 items-center gap-3 rounded-xl border border-s-4 bg-card p-3 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md", COLORS[g.color].tile)}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", COLORS[g.color].icon)}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t(label)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(desc)}</span>
              </span>
            </Link>
          ))}
        </section>
      ))}
    </div>
  )
}

