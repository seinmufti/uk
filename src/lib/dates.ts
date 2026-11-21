/** Today as yyyy-mm-dd in Iraq's time (servers run on UTC, three hours behind). */
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const parseISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

const two = (n: number) => String(n).padStart(2, "0")

/** Dates are always written as numbers, DD/MM/YYYY (e.g. 21/11/2026), in every language. */
// The language is still accepted (callers pass it) but no longer changes anything
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const formatDate = (s: string | null | undefined, _locale?: string) =>
  !s ? "—" : ((d) => `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`)(parseISODate(s))

/** A month as MM/YYYY (e.g. 11/2026). */
export const formatMonth = (s: string) => ((d) => `${two(d.getMonth() + 1)}/${d.getFullYear()}`)(parseISODate(s))

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
  if (period === "monthly") return formatMonth(from)
  if (period === "quarterly") return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
  return String(d.getFullYear())
}
