import "server-only"
import { db, DB_READY } from "./db"
import { num } from "./money"

const SOURCE = "https://borsa-alam.com/get_prices.php"
let lastSaved = 0

/**
 * Today's USD sell rate in IQD per 100 USD (e.g. 169350), from borsa-alam. Cached for 5 minutes.
 * When the site can't be reached, the last rate we saw (kept in settings) is used; null if there's none.
 */
export async function getRate(): Promise<{ rate: number; live: boolean } | null> {
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 300 }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const rows = (await res.json()) as { id: number; sell_rate: string }[]
    const row = rows.find((r) => r.id === 1) ?? rows[0]
    const rate = num(row?.sell_rate)
    if (!rate) throw new Error("No rate")
    if (DB_READY && rate !== lastSaved) {
      // Remember it for when the site is down (only when it changed; no need to wait for this)
      lastSaved = rate
      void db().from("settings").update({ last_rate_per_100: rate }).eq("id", 1).then(() => {})
    }
    return { rate, live: true }
  } catch {
    if (!DB_READY) return null
    const { data } = await db().from("settings").select("last_rate_per_100").eq("id", 1).single()
    const rate = num(data?.last_rate_per_100)
    return rate ? { rate, live: false } : null
  }
}
