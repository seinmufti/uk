import { getT } from "@/i18n/server"
import { plain } from "@/lib/money"
import { getRate } from "@/lib/rate"

/** Today's USD sell rate in the top bar. */
export async function RateBadge() {
  const t = await getT()
  const rate = await getRate()
  if (!rate) return <span className="text-xs text-muted-foreground">{t("app.rateUnavailable")}</span>
  return (
    <span className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs" title={t("app.ratePer100")}>
      <span className={rate.live ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-amber-500"} />
      <DollarBill />
      <span className="text-muted-foreground">=</span>
      <span className="font-medium tabular-nums">{plain(rate.rate, 0)} IQD</span>
    </span>
  )
}

/** A small green $100 note. */
function DollarBill() {
  return (
    <span
      aria-label="$100"
      className="relative flex h-[18px] w-[38px] items-center justify-center rounded-[3px] bg-[#7fa77a] p-[2px] text-[#173b22] shadow-sm dark:bg-[#6b9466]"
    >
      <span className="absolute inset-[2px] rounded-[2px] border border-[#173b22]/40" />
      <span className="absolute start-[4px] top-[2px] text-[6px] font-bold leading-none">100</span>
      <span className="absolute bottom-[2px] end-[4px] text-[6px] font-bold leading-none">100</span>
      <span className="relative flex size-[11px] items-center justify-center rounded-full border border-[#173b22]/50 bg-[#a9c8a2] text-[8px] font-bold leading-none">
        $
      </span>
    </span>
  )
}
