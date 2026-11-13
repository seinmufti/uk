-- Demo data. Run after the migration (Supabase SQL editor, or `npx supabase db reset` locally).

insert into customers (id, name, phone, address) values
  ('00000000-0000-0000-0000-000000000c01', 'Al-Noor Trading', '+964 750 111 2233', 'Erbil'),
  ('00000000-0000-0000-0000-000000000c02', 'Baghdad Builders', '+964 770 444 5566', 'Baghdad'),
  ('00000000-0000-0000-0000-000000000c03', 'Zagros Cafe', '+964 751 999 0011', 'Sulaymaniyah');

insert into suppliers (id, name, phone) values
  ('00000000-0000-0000-0000-000000000501', 'Gulf Electronics', '+971 4 555 1234'),
  ('00000000-0000-0000-0000-000000000502', 'Erbil Office Supply', '+964 750 222 3344');

insert into invoices (id, number, date, customer_id, rate_per_100, status) values
  ('00000000-0000-0000-0000-00000000a001', 1, current_date - 40, '00000000-0000-0000-0000-000000000c01', 169100, 'paid'),
  ('00000000-0000-0000-0000-00000000a002', 2, current_date - 12, '00000000-0000-0000-0000-000000000c02', 169200, 'unpaid'),
  ('00000000-0000-0000-0000-00000000a003', 3, current_date - 2, '00000000-0000-0000-0000-000000000c03', 169350, 'paid');

insert into invoice_items (invoice_id, description, qty, total_usd, sort) values
  ('00000000-0000-0000-0000-00000000a001', 'Network installation', 1, 1200, 0),
  ('00000000-0000-0000-0000-00000000a001', 'Cat6 cable (box)', 4, 320, 1),
  ('00000000-0000-0000-0000-00000000a002', 'CCTV cameras', 8, 1840, 0),
  ('00000000-0000-0000-0000-00000000a003', 'POS system setup', 1, 650, 0);

insert into expenses (date, category, description, amount_usd, recurring) values
  (date_trunc('month', current_date)::date, 'rent', 'Office rent', 800, true),
  (date_trunc('month', current_date)::date + 4, 'utilities', 'Generator subscription', 120, true),
  (current_date - 3, 'fuel', 'Fuel for van', 60, false);

insert into employees (name, position, base_salary_usd, start_date) values
  ('Ahmed Karim', 'Technician', 700, '2025-03-01'),
  ('Sara Hassan', 'Accountant', 900, '2024-09-15');

insert into inventory_items (kind, name, qty, value_usd, date) values
  ('capital', 'Owner investment', 1, 20000, '2025-01-01'),
  ('asset', 'Delivery van', 1, 9000, '2025-02-10'),
  ('stock', 'IP cameras', 12, 1440, current_date - 20);
