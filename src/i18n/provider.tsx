"use client"

import { createContext, useContext, useMemo } from "react"
import { dirFor, type Locale } from "./locales"
import { translator, type Translate } from "./translate"

type I18n = { locale: Locale; dir: "ltr" | "rtl"; t: Translate }

const I18nContext = createContext<I18n | null>(null)

/** Set once in the root layout from the language cookie. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, dir: dirFor(locale), t: translator(locale) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** The current language, its direction and t() for looking up text. */
export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>")
  return value
}

export const useT = () => useI18n().t
