import { ArrowLeftRight, BarChart3, Banknote, Building2, CalendarCheck, FileText, HandCoins, Package, Receipt, ShoppingCart, Truck, Users, UserSquare2 } from "lucide-react"
import Link from "next/link"
import { getT } from "@/i18n/server"
import type { MessageKey } from "@/i18n/types"
import { featureOf, isEnabled } from "@/lib/features"

type Tile = { href: string; label: MessageKey; desc: MessageKey; icon: typeof FileText }

const GROUPS: { title: MessageKey; tiles: Tile[] }[] = [
  {
    title: "home.group.finance",
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
    tiles: [
      { href: "/customers", label: "nav.customers", desc: "home.desc.customers", icon: Users },
      { href: "/suppliers", label: "nav.suppliers", desc: "home.desc.suppliers", icon: Truck },
    ],
  },
  {
    title: "home.group.assets",
    tiles: [
      { href: "/inventory?tab=asset", label: "inventory.kind.asset", desc: "home.desc.asset", icon: Building2 },
      { href: "/inventory?tab=stock", label: "inventory.kind.stock", desc: "home.desc.stock", icon: Package },
      { href: "/inventory?tab=capital", label: "inventory.kind.capital", desc: "home.desc.capital", icon: Banknote },
    ],
  },
  {
    title: "home.group.hr",
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
          <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(g.title)}</h2>
          {g.tiles.map(({ href, label, desc, icon: Icon }) => (
            <Link
              prefetch={false}
              key={href}
              href={href}
              className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-muted/50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-background">
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

