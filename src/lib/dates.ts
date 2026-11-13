/** Today as yyyy-mm-dd in local time. */
export const today = () => toISODate(new Date())

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const parseISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const formatDate = (s: string | null | undefined) =>
  s ? parseISODate(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"

export const PERIODS = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const
export type Period = (typeof PERIODS)[number]
export const isPeriod = (v: unknown): v is Period => PERIODS.includes(v as Period)

/** The range [from, to] (inclusive, yyyy-mm-dd) of the period containing `anchor`. Weeks start on Saturday. */
export function periodRange(period: Period, anchor: string): { from: string; to: string } {
  const d = parseISODate(anchor)
  const y = d.getFullYear()
  const m = d.getMonth()
  switch (period) {
    case "daily":
      return { from: anchor, to: anchor }
    case "weekly": {
      const start = new Date(d)
      start.setDate(d.getDate() - ((d.getDay() + 1) % 7))
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { from: toISODate(start), to: toISODate(end) }
    }
    case "monthly":
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) }
    case "quarterly": {
      const q = Math.floor(m / 3) * 3
      return { from: toISODate(new Date(y, q, 1)), to: toISODate(new Date(y, q + 3, 0)) }
    }
    case "yearly":
      return { from: `${y}-01-01`, to: `${y}-12-31` }
  }
}

/** Moves the anchor one period back (-1) or forward (+1). */
export function shiftPeriod(period: Period, anchor: string, step: -1 | 1) {
  const d = parseISODate(anchor)
  if (period === "daily") d.setDate(d.getDate() + step)
  else if (period === "weekly") d.setDate(d.getDate() + 7 * step)
  else if (period === "monthly") d.setMonth(d.getMonth() + step, 1)
  else if (period === "quarterly") d.setMonth(d.getMonth() + 3 * step, 1)
  else d.setFullYear(d.getFullYear() + step, 0, 1)
  return toISODate(d)
}

export function periodLabel(period: Period, anchor: string) {
  const { from, to } = periodRange(period, anchor)
  const d = parseISODate(from)
  if (period === "daily") return formatDate(from)
  if (period === "weekly") return `${formatDate(from)} – ${formatDate(to)}`
  if (period === "monthly") return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  if (period === "quarterly") return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
  return String(d.getFullYear())
}
