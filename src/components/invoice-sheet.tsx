import Image from "next/image"
import logo from "@/assets/logo.webp"
import { dirFor, type Locale } from "@/i18n/locales"
import { translator } from "@/i18n/translate"
import { COMPANY } from "@/lib/company"
import type { DocKind, Invoice } from "@/lib/data/types"
import { formatDate } from "@/lib/dates"
import { docNumber, iqd, plain, usd, usdToIqd } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * The printed invoice (print / PDF), laid out like a shop's receipt book: the business's name in Kurdish
 * and English around the logo, a contact strip, the customer and invoice details, the lines, a notes box
 * beside the totals, and signature lines. Labels are in the chosen language; the business name is always
 * in Kurdish (and English).
 */
/** A customer invoice prints as a payment invoice (no signatures) or a quotation (with signature lines). */
export type SheetVariant = "payment" | "quotation"

export function InvoiceSheet({ invoice, lang, kind = "sale", variant }: { invoice: Invoice; lang: Locale; kind?: DocKind; variant?: SheetVariant }) {
  const t = translator(lang)
  const dir = dirFor(lang)
  const sale = kind === "sale"
  const paid = invoice.status === "paid"
  const mode = invoice.currency_mode
  const toIqd = (n: number) => usdToIqd(n, invoice.rate_per_100)
  // Lines are in the invoice's own currency only; the other one shows in the totals
  const money = (n: number) => (mode === "iqd" ? iqd(toIqd(n)) : usd(n))
  const cur = mode === "iqd" ? "IQD" : "USD"
  // The totals' main currency (IQD for USD → IQD and IQD invoices), and the other one
  const main = (n: number) => (mode === "usd" ? usd(n) : iqd(toIqd(n)))
  // USD → IQD invoices show both currencies; USD-only and IQD-only ones never show the other
  const other = (n: number) => (mode !== "usd_iqd" || !invoice.rate_per_100 ? null : usd(n))
  const due = Math.max(0, invoice.total_usd - invoice.amount_paid_usd)
  const discounted = invoice.discount_usd > 0

  return (
    <div
      lang={lang}
      dir={dir}
      className={cn("paper flex min-h-[1123px] flex-col bg-white p-[12mm] text-[13px] text-neutral-900 print:min-h-[272mm] print:px-[12mm] print:py-0", dir === "rtl" && "font-[family-name:var(--font-arabic)]")}
      style={{ colorScheme: "light" }}
    >
      {/* Header: Kurdish name · logo · English name */}
      {/* data-keep: blocks a picture export never cuts through (it starts a new page before them instead) */}
      <header data-keep className="grid grid-cols-[1fr_auto_1fr] items-center gap-4" dir="rtl">
        <div className="text-center font-[family-name:var(--font-arabic)]">
          <div className="text-2xl leading-tight font-extrabold text-amber-600">{COMPANY.nameKu}</div>
          <div className="mt-1 text-sm font-semibold text-neutral-700">{COMPANY.taglineKu}</div>
        </div>
        <Image src={logo} alt="UK Group" width={120} height={120} loading="eager" className="size-[120px] rounded-full" />
        <div className="text-center" dir="ltr">
          <div className="text-2xl leading-tight font-extrabold tracking-tight text-amber-600">{COMPANY.nameEn}</div>
          <div className="mt-1 text-sm font-semibold text-neutral-700">{COMPANY.taglineEn}</div>
        </div>
      </header>

      {/* Contact strip */}
      <div data-keep className="mt-4 flex overflow-hidden rounded-md text-sm font-semibold" dir="rtl">
        <div className="flex flex-1 items-center gap-2 bg-amber-500 px-4 py-2 font-[family-name:var(--font-arabic)] text-neutral-950">
          <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-current" aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          {COMPANY.address}
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 bg-neutral-900 px-4 py-2 text-amber-400" dir="ltr">
          {COMPANY.phones.join("  -  ")}
        </div>
      </div>

      {/* The invoice and who it is for */}
      <section data-keep className="mt-5 grid grid-cols-2 gap-8 border-b-2 border-neutral-800 pb-4">
        <dl className="grid content-start gap-2">
          <Row label={t(sale ? "invoices.customer" : "purchases.supplier")}>
            <span className="font-bold">{invoice.customer?.name ?? t(sale ? "invoices.noCustomer" : "purchases.noSupplier")}</span>
          </Row>
          {invoice.customer?.phone && (
            <Row label={t("common.phone")}>
              <span dir="ltr">{invoice.customer.phone}</span>
            </Row>
          )}
          {invoice.customer?.address && <Row label={t("common.address")}>{invoice.customer.address}</Row>}
        </dl>
        <dl className="grid content-start gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded bg-neutral-900 px-3 py-1 text-sm font-bold text-white">{t(variant === "quotation" ? "sheet.quotation" : sale ? "nav.invoices" : "nav.purchases")}</span>
            <span className="text-sm text-neutral-500">{t("sheet.original")}</span>
          </div>
          <Row label={t(sale ? "invoices.number" : "purchases.number")}>
            <span className="font-mono text-lg font-bold text-red-600" dir="ltr">
              {docNumber(invoice.number)}
            </span>
          </Row>
          <Row label={t("common.date")}>{formatDate(invoice.date, lang)}</Row>
          {!paid && invoice.due_date && <Row label={t("invoices.dueDate")}>{formatDate(invoice.due_date, lang)}</Row>}
          <Row label={t("common.status")}>
            <span className={cn("font-semibold", paid ? "text-emerald-700" : "text-amber-700")}>
              {t(paid ? "invoices.status.paid" : invoice.amount_paid_usd > 0 ? "invoices.partlyPaid" : "invoices.status.unpaid")}
            </span>
          </Row>
        </dl>
      </section>

      {/* The lines */}
      <table className="mt-5 w-full border-collapse border border-neutral-400 text-[13px]">
        <thead>
          <tr data-keep className="bg-neutral-100 text-neutral-700">
            <th className="w-10 border border-neutral-400 px-2 py-1.5 text-center font-semibold">#</th>
            <th className="border border-neutral-400 px-2 py-1.5 text-start font-semibold">{t("common.description")}</th>
            <th className="w-16 border border-neutral-400 px-2 py-1.5 text-center font-semibold">{t("common.qty")}</th>
            <th className="w-32 border border-neutral-400 px-2 py-1.5 text-end font-semibold">
              {t("invoices.cost")} ({cur})
            </th>
            <th className="w-36 border border-neutral-400 px-2 py-1.5 text-end font-semibold">
              {t("common.total")} ({cur})
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr data-keep key={item.id ?? i} className="break-inside-avoid">
              <td className="border border-neutral-300 px-2 py-1.5 text-center text-neutral-500">{i + 1}</td>
              <td className="border border-neutral-300 px-2 py-1.5">{item.description}</td>
              <td className="border border-neutral-300 px-2 py-1.5 text-center tabular-nums">{plain(item.qty, 3)}</td>
              <td className="border border-neutral-300 px-2 py-1.5 text-end tabular-nums">
                <bdi dir="ltr">{money(item.unit_price_usd)}</bdi>
              </td>
              <td className="border border-neutral-300 px-2 py-1.5 text-end font-semibold tabular-nums">
                <bdi dir="ltr">{money(item.total_usd)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes beside the totals: never split across two pages (moves to the next page whole) */}
      <section data-keep className="mt-5 grid break-inside-avoid grid-cols-[1fr_300px] items-start gap-6">
        <div className="relative min-h-32 rounded-xl border-2 border-neutral-400 p-4 pt-5">
          <span className="absolute -top-3 end-4 rounded bg-neutral-800 px-2 py-0.5 text-xs font-semibold text-white">{t("common.notes")}</span>
          <p className="whitespace-pre-wrap">{invoice.notes}</p>
        </div>
        <div className="grid gap-1">
          {discounted && (
            <>
              <Sum label={t(mode === "iqd" ? "invoices.totalIqd" : "invoices.subtotalUsd")} value={money(invoice.subtotal_usd)} />
              <Sum label={t("invoices.discount")} value={`− ${money(invoice.discount_usd)}`} />
            </>
          )}
          {mode === "usd_iqd" && <Sum label={t(discounted ? "invoices.afterDiscountUsd" : "invoices.totalUsd")} value={usd(invoice.total_usd)} />}
          {mode === "usd_iqd" && <Sum label={t("invoices.exchangeRate")} value={plain(invoice.rate_per_100, 0)} />}
          <Sum
            strong
            label={t(mode === "usd" ? (discounted ? "invoices.afterDiscountUsd" : "invoices.totalUsd") : discounted ? "invoices.afterDiscountIqd" : "invoices.totalIqd")}
            value={main(invoice.total_usd)}
            sub={mode !== "usd_iqd" ? other(invoice.total_usd) : null}
          />
          <Sum label={t("invoices.paidAmount")} value={main(invoice.amount_paid_usd)} sub={other(invoice.amount_paid_usd)} />
          <Sum strong label={t("invoices.balanceDue")} value={main(due)} sub={other(due)} tone={due > 0 ? "due" : undefined} />
        </div>
      </section>

      {/* Signatures: on quotations (and purchase invoices), not on payment invoices */}
      {variant !== "payment" && (
      <section data-keep className="mt-auto grid break-inside-avoid grid-cols-2 gap-16 pt-16">
        <div>
          <div className="text-sm font-semibold">{t("sheet.accountantSignature")}:</div>
          <div className="mt-12 border-b border-dashed border-neutral-500" />
        </div>
        <div>
          <div className="text-sm font-semibold">{t("sheet.recipientSignature")}:</div>
          <div className="mt-12 border-b border-dashed border-neutral-500" />
        </div>
      </section>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-neutral-500">{label}:</dt>
      <dd className="min-w-0 border-b border-dotted border-neutral-400 pb-0.5">{children}</dd>
    </div>
  )
}

/** One total: a grey label cell and a boxed value, like the balance boxes on a receipt. */
function Sum({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string | null; strong?: boolean; tone?: "due" }) {
  return (
    <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded border border-neutral-400">
      <span className={cn("bg-neutral-200 px-2 py-1.5 text-neutral-700", strong && "font-bold text-neutral-900")}>{label}</span>
      <span className={cn("flex min-w-32 flex-col items-end justify-center px-2 py-1 tabular-nums", strong && "text-[15px] font-bold", tone === "due" && "text-amber-700")}>
        <bdi dir="ltr">{value}</bdi>
        {sub && (
          <bdi dir="ltr" className="text-[11px] font-normal text-neutral-500">
            {sub}
          </bdi>
        )}
      </span>
    </div>
  )
}
