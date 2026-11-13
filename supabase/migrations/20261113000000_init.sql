-- UK accounting: initial schema.
-- The app talks to the database only from the server with the service-role key, so every table has
-- row level security on and no policies: nobody can reach the data with the public (anon) key.
-- Money is stored in USD; IQD is derived with the saved exchange rate (IQD per 100 USD).

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  date date not null default current_date,
  customer_id uuid references customers(id) on delete set null,
  rate_per_100 numeric(14, 2) not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  notes text,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty numeric(14, 3) not null default 1,
  total_usd numeric(14, 2) not null default 0,
  sort integer not null default 0
);
create index on invoice_items (invoice_id);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  date date not null default current_date,
  supplier_id uuid references suppliers(id) on delete set null,
  payment_status text not null default 'paid' check (payment_status in ('paid', 'debt')),
  amount_paid_usd numeric(14, 2) not null default 0,
  sent_to_inventory boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  description text not null,
  qty numeric(14, 3) not null default 1,
  unit_cost_usd numeric(14, 2) not null default 0,
  sort integer not null default 0
);
create index on purchase_items (purchase_id);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('asset', 'stock', 'capital')),
  name text not null,
  qty numeric(14, 3) not null default 1,
  value_usd numeric(14, 2) not null default 0, -- total value of the row (not per unit)
  date date not null default current_date,
  notes text,
  source_purchase_id uuid references purchases(id) on delete set null,
  created_at timestamptz not null default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('receivable', 'payable')),
  party text not null,
  customer_id uuid references customers(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  purchase_id uuid references purchases(id) on delete cascade,
  amount_usd numeric(14, 2) not null,
  paid_usd numeric(14, 2) not null default 0,
  date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  category text not null default 'other',
  description text not null,
  amount_usd numeric(14, 2) not null,
  recurring boolean not null default false,
  payroll_id uuid,
  created_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text,
  phone text,
  base_salary_usd numeric(14, 2) not null default 0,
  start_date date not null default current_date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  type text not null default 'paid' check (type in ('paid', 'unpaid', 'sick')),
  notes text,
  created_at timestamptz not null default now()
);

create table absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  days numeric(5, 2) not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

create table payroll (
  id uuid primary key default gen_random_uuid(),
  month date not null, -- first day of the month
  employee_id uuid not null references employees(id) on delete cascade,
  base_usd numeric(14, 2) not null,
  deductions_usd numeric(14, 2) not null default 0,
  bonuses_usd numeric(14, 2) not null default 0,
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  unique (month, employee_id)
);

alter table expenses add constraint expenses_payroll_fk foreign key (payroll_id) references payroll(id) on delete cascade;

create table settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'My Company',
  zakat_percent numeric(5, 2) not null default 2,
  last_rate_per_100 numeric(14, 2)
);
insert into settings (id) values (1);

alter table customers enable row level security;
alter table suppliers enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table inventory_items enable row level security;
alter table debts enable row level security;
alter table expenses enable row level security;
alter table employees enable row level security;
alter table leaves enable row level security;
alter table absences enable row level security;
alter table payroll enable row level security;
alter table settings enable row level security;
