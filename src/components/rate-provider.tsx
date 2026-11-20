"use client"

import { createContext, useContext } from "react"

const RateContext = createContext<number | null>(null)

/** Today's rate (IQD per 100 USD) for every page, so amounts can show in both currencies. */
export function RateProvider({ rate, children }: { rate: number | null; children: React.ReactNode }) {
  return <RateContext.Provider value={rate}>{children}</RateContext.Provider>
}

export const useRate = () => useContext(RateContext)
