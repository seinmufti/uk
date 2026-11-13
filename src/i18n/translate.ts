import ar from "./dictionaries/ar"
import ckb from "./dictionaries/ckb"
import en from "./dictionaries/en"
import type { Locale } from "./locales"
import type { MessageKey, Vars } from "./types"

const DICTIONARIES: Record<Locale, unknown> = { en, ar, ckb }

const lookup = (dict: unknown, key: string) =>
  key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), dict)

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text

export type Translate = {
  (key: MessageKey, vars?: Vars): string
  /** For keys built at runtime (e.g. "pool.filters." + key); returns `fallback` when there's no such text. */
  dynamic: (key: string, fallback: string, vars?: Vars) => string
}

const EASTERN = "٠١٢٣٤٥٦٧٨٩"
/** "5 days" → "٥ days" for Arabic and Kurdish; a digit right after a letter (level "C1", "B2") stays as it is. */
export const localDigits = (locale: Locale, text: string) =>
  locale === "en" ? text : text.replace(/(?<![A-Za-z\d])\d+/g, (n) => [...n].map((d) => EASTERN[Number(d)]).join(""))

/** t("nav.home") in the given language, falling back to English for anything not translated yet. */
export function translator(locale: Locale): Translate {
  const find = (key: string) => {
    const own = lookup(DICTIONARIES[locale], key)
    if (typeof own === "string") return own
    const english = lookup(en, key)
    return typeof english === "string" ? english : undefined
  }
  const t = ((key: MessageKey, vars?: Vars) => localDigits(locale, fill(find(key) ?? key, vars))) as Translate
  t.dynamic = (key, fallback, vars) => localDigits(locale, fill(find(key) ?? fallback, vars))
  return t
}
