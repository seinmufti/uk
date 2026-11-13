// The languages the app is shown in. The choice is kept in a cookie so the server renders the
// page in the right language and direction straight away (no flash of English).

export const LOCALES = ["en", "ar", "ckb"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "uk-locale"

/** Each language in its own script, for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ckb: "کوردی",
}

export const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale)

/** Arabic and Kurdish (Sorani) are written right to left. */
export const dirFor = (locale: Locale): "ltr" | "rtl" => (locale === "en" ? "ltr" : "rtl")

/** Remembers the chosen language for a year; the next server render uses it. */
export function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}
