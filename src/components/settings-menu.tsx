"use client"

import { Download, History, Languages, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isLocale, LOCALE_NAMES, LOCALES, saveLocale, type Locale } from "@/i18n/locales"
import { useI18n } from "@/i18n/provider"
import { signOut } from "@/lib/actions/session"

const THEMES = [
  { value: "light", label: "settings.light", icon: Sun },
  { value: "dark", label: "settings.dark", icon: Moon },
  { value: "system", label: "settings.system", icon: Monitor },
] as const

/** The gear in the top bar: theme, language, history, backup and sign out. */
export function SettingsMenu() {
  const { t, locale } = useI18n()
  const { theme = "system", setTheme } = useTheme()
  const [pending, start] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("settings.title")} title={t("settings.title")} />}>
        <Settings />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("settings.theme")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(String(v))}>
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon /> {t(label)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <Languages className="size-3.5" /> {t("settings.language")}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(v) => {
              if (!isLocale(String(v)) || v === locale) return
              saveLocale(v as Locale)
              // Reload so every page (and the ones loaded in the background) comes back in the new language
              location.reload()
            }}
          >
            {LOCALES.map((l) => (
              <DropdownMenuRadioItem key={l} value={l}>
                {LOCALE_NAMES[l]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/history" />}>
          <History /> {t("history.title")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/backup`} download />}>
          <Download /> {t("history.backup")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onClick={() => start(() => signOut())}>
          <LogOut /> {t("app.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
