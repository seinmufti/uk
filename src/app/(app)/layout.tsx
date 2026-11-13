import { Calculator, LogOut } from "lucide-react"
import { Suspense } from "react"
import { MobileNav, SideNav } from "@/components/app-nav"
import { RateBadge } from "@/components/rate-badge"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { signOut } from "@/lib/actions/session"
import { DB_READY } from "@/lib/db"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const t = await getT()
  return (
    <div className="flex h-dvh">
      <aside className="hidden w-56 shrink-0 flex-col border-e bg-muted/30 p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 py-1">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Calculator className="size-4" />
          </div>
          <span className="font-semibold">{t("app.name")}</span>
        </div>
        <SideNav />
        <form action={signOut} className="mt-auto">
          <Button type="submit" variant="ghost" className="w-full justify-start text-muted-foreground">
            <LogOut /> {t("app.signOut")}
          </Button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:px-5">
          <MobileNav title={t("app.name")} />
          <span className="font-semibold md:hidden">{t("app.name")}</span>
          <div className="ms-auto">
            <Suspense>
              <RateBadge />
            </Suspense>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          {DB_READY ? (
            children
          ) : (
            <div className="mx-auto max-w-lg p-8">
              <h1 className="text-lg font-semibold">{t("setup.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("setup.body")}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
