import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { dirFor } from "@/i18n/locales"
import { I18nProvider } from "@/i18n/provider"
import { getLocale } from "@/i18n/server"
import "./globals.css"

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
// Arabic and Kurdish (Sorani) text; Latin text keeps Geist
const notoArabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"] })

export const metadata: Metadata = {
  title: "UK Accounting",
  description: "Invoices, purchases, inventory, HR and reports.",
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale()
  const dir = dirFor(locale)
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <I18nProvider locale={locale}>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="bottom-right" dir={dir} />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
