import { Calculator } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { getT } from "@/i18n/server"

/** The centred card the sign-in, sign-up and approve pages sit in. */
export async function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
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
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
    </main>
  )
}
