import Image from "next/image"
import bill from "@/assets/usd-100.jpg"
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

/** A real $100 note (public-domain image of the 2009 series, Wikimedia Commons). */
function DollarBill() {
  return <Image src={bill} alt="$100" height={18} className="h-[18px] w-auto rounded-[2px] shadow-sm" priority />
}
