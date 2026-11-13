-- How an invoice shows its money: USD only, USD with the IQD total, or IQD only (lines typed in IQD).
-- Amounts are still stored in USD; lines keep 6 decimals so IQD amounts come back exactly.
alter table invoices add column currency_mode text not null default 'usd_iqd' check (currency_mode in ('usd', 'usd_iqd', 'iqd'));
alter table invoice_items alter column unit_price_usd type numeric(18, 6), alter column total_usd type numeric(18, 6);
