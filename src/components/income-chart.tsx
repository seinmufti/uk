"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useI18n } from "@/i18n/provider"
import type { Bucket } from "@/lib/data/reports"
import { usd } from "@/lib/money"

// Categorical slots 1 and 2 of the validated reference palette (blue, orange)
const INCOME = "#2a78d6"
const EXPENSES = "#eb6834"

/** Income vs expenses per day / month of the period. */
export function IncomeChart({ data }: { data: Bucket[] }) {
  const { t, dir } = useI18n()
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer>
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} reversed={dir === "rtl"} interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={56}
            orientation={dir === "rtl" ? "right" : "left"}
            tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(value) => usd(Number(value))}
            contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name={t("reports.income")} fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenses" name={t("reports.expenses")} fill={EXPENSES} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
