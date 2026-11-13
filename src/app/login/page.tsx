import { Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"
import { signInDemo } from "@/lib/actions/session"
import { ThemeToggle } from "@/components/theme-toggle"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

export default async function LoginPage() {
  if (await getSession()) redirect("/invoices")
  const t = await getT()
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="absolute end-3 top-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="size-5" />
          </div>
          <span className="text-lg font-semibold">{t("app.name")}</span>
        </div>
        <h1 className="text-xl font-semibold">{t("login.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
        <form action={signInDemo} className="mt-6">
          <Button type="submit" size="lg" className="w-full">
            {t("login.demo")}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">{t("login.demoNote")}</p>
      </div>
    </main>
  )
}
