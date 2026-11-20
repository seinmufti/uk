-- 1. Invoices not paid in full can have a due date.
alter table invoices add column due_date date;

-- 2. Purchases (buying invoices) work like sales invoices: USD / USD → IQD / IQD, a rate, a discount, a due date,
--    and lines kept to 6 decimals so IQD amounts come back exactly.
alter table purchases
  add column currency_mode text not null default 'usd' check (currency_mode in ('usd', 'usd_iqd', 'iqd')),
  add column rate_per_100 numeric(14, 2) not null default 0,
  add column discount_usd numeric(18, 6) not null default 0 check (discount_usd >= 0),
  add column due_date date,
  alter column amount_paid_usd type numeric(18, 6);
update purchases set rate_per_100 = coalesce((select last_rate_per_100 from settings where id = 1), 0);
alter table purchase_items alter column unit_cost_usd type numeric(18, 6);

-- 3. Payroll bonuses and deductions as separate entries (amount + reason), added up on the payroll row.
create table payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references payroll(id) on delete cascade,
  kind text not null check (kind in ('bonus', 'deduction')),
  amount_usd numeric(14, 2) not null check (amount_usd > 0),
  reason text,
  created_at timestamptz not null default now()
);
create index payroll_items_payroll_idx on payroll_items (payroll_id);
alter table payroll_items enable row level security;
create trigger payroll_items_history after insert or update or delete on payroll_items for each row execute function record_history();
-- The amounts typed straight onto payroll rows so far become entries
insert into payroll_items (payroll_id, kind, amount_usd, reason)
select id, 'deduction', deductions_usd, 'Unpaid leave and absences' from payroll where deductions_usd > 0;
insert into payroll_items (payroll_id, kind, amount_usd, reason)
select id, 'bonus', bonuses_usd, null from payroll where bonuses_usd > 0;
