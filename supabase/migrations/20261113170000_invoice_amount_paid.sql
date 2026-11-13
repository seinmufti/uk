-- How much of an invoice has been paid (USD). Paid in full = the total; the status follows it.
alter table invoices add column amount_paid_usd numeric(18, 6) not null default 0;
update invoices i set amount_paid_usd = coalesce((select sum(total_usd) from invoice_items where invoice_id = i.id), 0) where status = 'paid';
