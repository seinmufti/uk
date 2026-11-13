-- Receipts: money received from a customer (kind 'in') or paid to a supplier (kind 'out').
-- A receipt can settle an unpaid invoice (in full) or part of a debt; otherwise it is "on account".
create table receipts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('in', 'out')),
  number integer not null,
  date date not null default current_date,
  customer_id uuid references customers(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  party text not null,
  amount_usd numeric(14, 2) not null check (amount_usd > 0),
  rate_per_100 numeric(14, 2) not null,
  method text not null default 'cash' check (method in ('cash', 'bank', 'other')),
  invoice_id uuid references invoices(id) on delete set null,
  debt_id uuid references debts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (kind, number)
);
create index receipts_date_idx on receipts (date desc);
alter table receipts enable row level security;
