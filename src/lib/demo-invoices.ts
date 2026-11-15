// Sample invoice data for the demo's "fill with sample data" button. Each click picks at random:
// the currency mode, customer, date, how many lines and which ones, quantities, discount, payment and notes.

import type { CurrencyMode } from "@/lib/data/types"
import { toISODate } from "@/lib/dates"

/** A product or service with a typical price range in USD. */
const ITEMS: [string, number, number][] = [
  ["Cement bags (50 kg)", 6, 9],
  ["Steel rebar 12 mm (ton)", 620, 780],
  ["Red bricks (1000 pcs)", 90, 130],
  ["Ceramic floor tiles (m²)", 8, 22],
  ["Paint, white emulsion (20 L)", 35, 60],
  ["PVC pipes 4 inch (6 m)", 12, 20],
  ["Electrical cable 2.5 mm (100 m)", 28, 45],
  ["Aluminium window frame", 110, 240],
  ["Wooden door with frame", 140, 320],
  ["Plumbing installation (day)", 40, 70],
  ["Electrician labour (day)", 35, 60],
  ["Delivery to site", 15, 50],
  ["Generator rental (week)", 120, 200],
  ["Split AC unit 2 ton", 380, 520],
  ["Water tank 2000 L", 160, 230],
  ["Gypsum board (sheet)", 5, 9],
  ["Office desk", 90, 180],
  ["Office chair", 45, 120],
  ["Laptop", 480, 1100],
  ["Printer toner cartridge", 25, 70],
  ["Website maintenance (month)", 80, 250],
  ["Consulting (hour)", 20, 60],
  ["Diesel (1000 L)", 640, 820],
  ["Rice bags (25 kg)", 18, 26],
  ["Cooking oil (18 L)", 22, 32],
]

const NOTES = [
  "",
  "",
  "Delivered to the site in Erbil.",
  "Payment due within 30 days.",
  "Thank you for your business.",
  "Prices include delivery.",
  "Second part of the order.",
  "Warranty: 1 year on parts.",
]

const MODES: CurrencyMode[] = ["usd", "usd_iqd", "iqd"]

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]
const between = (min: number, max: number) => min + Math.random() * (max - min)

export type DemoInvoice = {
  mode: CurrencyMode
  customerId: string
  date: string
  rows: { description: string; qty: string; cost: string }[]
  payment: "none" | "full" | "part"
  paidText: string
  discountText: string
  notes: string
}

/** A random, realistic invoice. Costs are in IQD for IQD mode (rounded to 250), else in USD. */
export function randomDemoInvoice(customerIds: string[], rate: number): DemoInvoice {
  const mode = pick(MODES)
  const inIqd = mode === "iqd"
  const lines = [...ITEMS].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 6))
  const rows = lines.map(([description, min, max]) => {
    const usd = between(min, max)
    const cost = inIqd ? Math.round((usd * rate) / 100 / 250) * 250 : Math.round(usd * 100) / 100
    const qty = usd > 300 ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 40)
    return { description, qty: String(qty), cost: String(cost) }
  })
  const total = rows.reduce((s, r) => s + Number(r.qty) * Number(r.cost), 0)
  // Sometimes a discount: a round amount, up to about 10%
  const discount = Math.random() < 0.35 ? (inIqd ? Math.round((total * between(0.02, 0.1)) / 1000) * 1000 : Math.round(total * between(0.02, 0.1))) : 0
  const payment = pick(["none", "none", "full", "part"] as const)
  const part = (total - discount) * between(0.2, 0.8)
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * 30))
  return {
    mode,
    customerId: Math.random() < 0.85 && customerIds.length ? pick(customerIds) : "",
    date: toISODate(date),
    rows,
    payment,
    paidText: payment === "part" ? String(inIqd ? Math.round(part / 1000) * 1000 : Math.round(part)) : "",
    notes: pick(NOTES),
    discountText: discount ? String(discount) : "",
  }
}
