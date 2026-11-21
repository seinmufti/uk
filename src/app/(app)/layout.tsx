import { UserRound } from "lucide-react"
import Image from "next/image"
import logo from "@/assets/logo.webp"
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
          <Image src={logo} alt="UK Group" width={32} height={32} priority className="size-8 rounded-md" />
          <span className="hidden font-semibold md:inline">{t("app.name")}</span>
        </Link>
        {/* The page's title (see PageHeader): in the middle of the bar, after the logo on phones */}
        <div id="nav-title" className="min-w-0 md:absolute md:left-1/2 md:max-w-[40%] md:-translate-x-1/2" />
        <div className="ms-auto flex items-center gap-1">
          <Suspense>
            <RateBadge />
          </Suspense>
          {/* Who is signed in */}
          <span className="flex items-center gap-1.5 px-2 text-sm font-medium" title={session.username}>
            <UserRound className="size-4 text-muted-foreground" />
            <span className="max-w-32 truncate" dir="auto">{session.username}</span>
          </span>
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
