-- The currency a bonus / deduction was typed in, and the rate then (so an IQD entry shows exactly as typed)
alter table public.payroll_items add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd'));
alter table public.payroll_items add column if not exists rate_per_100 numeric(14, 2);
alter table demo.payroll_items add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd'));
alter table demo.payroll_items add column if not exists rate_per_100 numeric(14, 2);
