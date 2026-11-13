import { cookies } from "next/headers"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./locales"

/** The language picked in the language switcher (a cookie), or English. */
export async function getLocale() {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/** t() for server components and server actions. */
export async function getT() {
  const { translator } = await import("./translate")
  return translator(await getLocale())
}
