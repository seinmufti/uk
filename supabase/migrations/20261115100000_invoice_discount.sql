-- A discount off the invoice (USD; typed in the invoice's own currency on the form).
-- The invoice's total, payments and balance are all after this discount.
alter table invoices add column discount_usd numeric(18, 6) not null default 0 check (discount_usd >= 0);
