/** Numbers from the database come back as strings (numeric columns). */
export const num = (value: unknown) => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0").replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Rounds to cents so sums don't drift (0.1 + 0.2). */
export const round2 = (n: number) => Math.round(n * 100) / 100
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6
/** IQD amount → USD at a rate per 100 USD. */
export const iqdToUsd = (amountIqd: number, ratePer100: number) => (ratePer100 ? (amountIqd * 100) / ratePer100 : 0)

export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

export const iqd = (n: number) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))} IQD`

export const plain = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n)

/** The rate is IQD per 100 USD (e.g. 169,350). */
export const usdToIqd = (amountUsd: number, ratePer100: number) => (amountUsd * ratePer100) / 100

/** Invoice and purchase numbers: 1 → "0001". */
export const docNumber = (n: number) => String(n).padStart(4, "0")
