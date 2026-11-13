import { Download } from "lucide-react"
import { HistoryButton } from "@/components/history-button"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { getT } from "@/i18n/server"
import { describe, listChanges } from "@/lib/data/history"
import { cn } from "@/lib/utils"

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export default async function HistoryPage() {
  const t = await getT()
  const changes = await listChanges()
  return (
    <div className="grid gap-4 p-4 md:p-6">
      <PageHeader
        title={t("history.title")}
        subtitle={t("history.subtitle")}
        actions={
          // A plain link: the browser downloads the file
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/backup`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium hover:bg-muted">
            <Download className="size-4" /> {t("history.backup")}
          </a>
        }
      />
      <div className="mx-auto w-full max-w-3xl divide-y rounded-lg border">
        {changes.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t("history.empty")}</p>}
        {changes.map((c) => {
          const { title, more } = describe(c)
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className={cn("min-w-0 flex-1", c.undone && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("truncate text-sm font-medium", c.undone && "line-through")}>{title}</span>
                  {more > 0 && <span className="text-xs text-muted-foreground">{t("history.more", { count: more })}</span>}
                  {c.undone && <Badge variant="secondary">{t("history.undone")}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{when(c.at)}</div>
              </div>
              <HistoryButton id={c.id} undone={c.undone} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
