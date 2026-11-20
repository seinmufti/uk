import { Calculator } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { LiveData } from "@/components/live-data"
import { RateBadge } from "@/components/rate-badge"
import { RateProvider } from "@/components/rate-provider"
import { SettingsMenu } from "@/components/settings-menu"
import { getT } from "@/i18n/server"
import { getSession } from "@/lib/auth"
import { DB_READY } from "@/lib/db"
import { getRate } from "@/lib/rate"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession()
  if (!session) redirect("/login")
  const [t, rate] = await Promise.all([getT(), getRate()])
  return (
    <RateProvider rate={rate?.rate ?? null}>
    <div className="flex h-dvh flex-col">
      <LiveData />
      <header className="relative flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3 md:px-5 print:hidden">
        <Link href="/" className="flex items-center gap-2 rounded-md px-1 py-1 hover:opacity-80">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Calculator className="size-4" />
          </span>
          <span className="font-semibold">{t("app.name")}</span>
        </Link>
        <div className="ms-auto flex items-center gap-1">
          <Suspense>
            <RateBadge />
          </Suspense>
          <SettingsMenu admin={session.admin} username={session.userId === "demo" ? null : session.username} />
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
    </RateProvider>
  )
}
