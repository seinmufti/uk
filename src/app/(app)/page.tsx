import { ArrowLeftRight, BarChart3, Banknote, Building2, CalendarCheck, FileText, HandCoins, Package, Plus, Receipt, ShoppingCart, Truck, Users, UserSquare2 } from "lucide-react"
import Link from "next/link"
import { getT } from "@/i18n/server"
import type { MessageKey } from "@/i18n/types"
import { featureOf, isEnabled } from "@/lib/features"
import { cn } from "@/lib/utils"

/** Small buttons on the tile's end side, e.g. + for a new invoice; tone is the button's colour (the column's when left out) */
type Shortcut = { href: string; label: MessageKey; icon: typeof FileText; tone?: string }
type Tile = { href: string; label: MessageKey; icon: typeof FileText; buttons?: Shortcut[] }

const GREEN = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
const RED = "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"

/** One colour per column: tile stripe, icon and column title. */
const COLORS = {
  finance: { title: "text-amber-600 dark:text-amber-400", tile: "border-s-amber-500 [--glow:var(--color-amber-400)]", icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  contacts: { title: "text-sky-600 dark:text-sky-400", tile: "border-s-sky-500 [--glow:var(--color-sky-400)]", icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  assets: { title: "text-emerald-600 dark:text-emerald-400", tile: "border-s-emerald-500 [--glow:var(--color-emerald-400)]", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  hr: { title: "text-violet-600 dark:text-violet-400", tile: "border-s-violet-500 [--glow:var(--color-violet-400)]", icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
}

const GROUPS: { title: MessageKey; color: keyof typeof COLORS; tiles: Tile[] }[] = [
  {
    title: "home.group.finance",
    color: "finance",
    tiles: [
      { href: "/invoices", label: "nav.invoices", icon: FileText, buttons: [{ href: "/invoices/new", label: "invoices.new", icon: Plus }] },
      { href: "/purchases", label: "nav.purchases", icon: ShoppingCart, buttons: [{ href: "/purchases/new", label: "purchases.new", icon: Plus }] },
      // Cash in from a customer (green), cash out to a supplier (red)
      {
        href: "/receipts",
        label: "nav.receipts",
        icon: ArrowLeftRight,
        buttons: [
          { href: "/receipts/new?kind=in", label: "receipts.newIn", icon: Banknote, tone: GREEN },
          { href: "/receipts/new?kind=out", label: "receipts.newOut", icon: Banknote, tone: RED },
        ],
      },
      { href: "/expenses", label: "nav.expenses", icon: Receipt },
      { href: "/debts", label: "nav.debts", icon: HandCoins },
      { href: "/reports", label: "nav.reports", icon: BarChart3 },
    ],
  },
  {
    title: "home.group.contacts",
    color: "contacts",
    tiles: [
      { href: "/customers", label: "nav.customers", icon: Users },
      { href: "/suppliers", label: "nav.suppliers", icon: Truck },
    ],
  },
  {
    title: "home.group.assets",
    color: "assets",
    tiles: [
      { href: "/inventory?tab=asset", label: "inventory.kind.asset", icon: Building2 },
      { href: "/inventory?tab=stock", label: "inventory.kind.stock", icon: Package },
      { href: "/inventory?tab=capital", label: "inventory.kind.capital", icon: Banknote },
    ],
  },
  {
    title: "home.group.hr",
    color: "hr",
    tiles: [
      { href: "/hr", label: "hr.employees", icon: UserSquare2 },
      { href: "/hr/payroll", label: "hr.payroll", icon: CalendarCheck },
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
          {g.tiles.map(({ href, label, icon: Icon, buttons = [] }) => (
            <div key={href} className="relative">
              <Link
                prefetch={false}
                href={href}
                className={cn("group flex min-w-0 items-center gap-3 glow-tile rounded-xl border border-s-4 bg-card p-3 shadow-xs", buttons.length === 1 && "pe-14", buttons.length > 1 && "pe-24", COLORS[g.color].tile)}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", COLORS[g.color].icon)}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 text-sm font-medium">{t(label)}</span>
              </Link>
              {buttons.length > 0 && (
                <div className="absolute end-3 top-1/2 flex -translate-y-1/2 gap-2">
                  {buttons.map((b) => (
                    <Link
                      key={b.href}
                      prefetch={false}
                      href={b.href}
                      title={t(b.label)}
                      aria-label={t(b.label)}
                      className={cn("flex size-9 items-center justify-center rounded-lg transition-shadow hover:ring-2 hover:ring-current", b.tone ?? COLORS[g.color].icon)}
                    >
                      <b.icon className="size-4" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

