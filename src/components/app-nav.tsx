"use client"

import { BarChart3, Boxes, FileText, HandCoins, Menu, Receipt, ShoppingCart, Truck, Users, UserSquare2, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/provider"
import type { MessageKey } from "@/i18n/types"
import { cn } from "@/lib/utils"

const LINKS: { href: string; label: MessageKey; icon: typeof FileText }[] = [
  { href: "/invoices", label: "nav.invoices", icon: FileText },
  { href: "/customers", label: "nav.customers", icon: Users },
  { href: "/purchases", label: "nav.purchases", icon: ShoppingCart },
  { href: "/suppliers", label: "nav.suppliers", icon: Truck },
  { href: "/inventory", label: "nav.inventory", icon: Boxes },
  { href: "/debts", label: "nav.debts", icon: HandCoins },
  { href: "/expenses", label: "nav.expenses", icon: Receipt },
  { href: "/hr", label: "nav.hr", icon: UserSquare2 },
  { href: "/reports", label: "nav.reports", icon: BarChart3 },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            <Icon className="size-4" />
            {t(label)}
          </Link>
        )
      })}
    </nav>
  )
}

/** The side menu on wide screens. */
export function SideNav() {
  return <NavLinks />
}

/** The menu button and slide-in menu on phones. */
export function MobileNav({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  const { dir } = useI18n()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-64 p-4">
        <SheetTitle className="mb-2 flex items-center gap-2">
          <Wallet className="size-4" /> {title}
        </SheetTitle>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
