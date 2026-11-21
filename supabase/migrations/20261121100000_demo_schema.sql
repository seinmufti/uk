-- The demo deployment gets its own copy of every table in a "demo" schema, so demo and live data never mix.
-- Live keeps using "public". Accounts (users) stay in public only: the demo signs in with one button.
-- The data entered so far is copied into demo; live is left as it is.

create schema if not exists demo;

do $$
declare t text;
begin
  -- Same columns, defaults, checks and indexes as live; then the existing rows
  foreach t in array array[
    'customers', 'suppliers', 'employees', 'settings', 'invoices', 'invoice_items', 'purchases', 'purchase_items',
    'inventory_items', 'debts', 'payroll', 'payroll_items', 'expenses', 'leaves', 'absences', 'receipts',
    'history_changes', 'history'
  ] loop
    execute format('create table demo.%I (like public.%I including all)', t, t);
    execute format('insert into demo.%I select * from public.%I', t, t);
    execute format('alter table demo.%I enable row level security', t);
  end loop;
end;
$$;

-- The links between tables (after the copy, so the order of copying doesn't matter)
alter table demo.invoices add foreign key (customer_id) references demo.customers(id) on delete set null;
alter table demo.invoice_items add foreign key (invoice_id) references demo.invoices(id) on delete cascade;
alter table demo.purchases add foreign key (supplier_id) references demo.suppliers(id) on delete set null;
alter table demo.purchase_items add foreign key (purchase_id) references demo.purchases(id) on delete cascade;
alter table demo.inventory_items add foreign key (source_purchase_id) references demo.purchases(id) on delete set null;
alter table demo.debts add foreign key (customer_id) references demo.customers(id) on delete set null;
alter table demo.debts add foreign key (supplier_id) references demo.suppliers(id) on delete set null;
alter table demo.debts add foreign key (purchase_id) references demo.purchases(id) on delete cascade;
alter table demo.leaves add foreign key (employee_id) references demo.employees(id) on delete cascade;
alter table demo.absences add foreign key (employee_id) references demo.employees(id) on delete cascade;
alter table demo.payroll add foreign key (employee_id) references demo.employees(id) on delete cascade;
alter table demo.payroll_items add foreign key (payroll_id) references demo.payroll(id) on delete cascade;
alter table demo.expenses add foreign key (payroll_id) references demo.payroll(id) on delete cascade;
alter table demo.receipts add foreign key (customer_id) references demo.customers(id) on delete set null;
alter table demo.receipts add foreign key (supplier_id) references demo.suppliers(id) on delete set null;
alter table demo.receipts add foreign key (invoice_id) references demo.invoices(id) on delete set null;
alter table demo.receipts add foreign key (debt_id) references demo.debts(id) on delete set null;
alter table demo.history add foreign key (change_id) references demo.history_changes(id) on delete cascade;

-- The demo's own history (undo / redo), written to demo.history
create or replace function demo.record_history() returns trigger
language plpgsql security definer set search_path = demo as $$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  change uuid;
  old_j jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_j jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if headers->>'x-history-skip' = '1' then
    return null;
  end if;
  if tg_op = 'UPDATE' and (old_j = new_j or (tg_table_name = 'settings' and old_j - 'last_rate_per_100' = new_j - 'last_rate_per_100')) then
    return null;
  end if;
  change := coalesce((headers->>'x-change-id')::uuid, gen_random_uuid());
  insert into demo.history_changes (id) values (change) on conflict (id) do nothing;
  insert into demo.history (change_id, tbl, op, row_id, old_row, new_row)
  values (change, tg_table_name, tg_op, coalesce(new_j->>'id', old_j->>'id'), old_j, new_j);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'customers', 'suppliers', 'invoices', 'invoice_items', 'purchases', 'purchase_items', 'inventory_items',
    'debts', 'expenses', 'employees', 'leaves', 'absences', 'payroll', 'payroll_items', 'settings', 'receipts'
  ] loop
    execute format('create trigger %I after insert or update or delete on demo.%I for each row execute function demo.record_history()', t || '_history', t);
  end loop;
end;
$$;

-- The history ids get their own counter
create sequence demo.history_id_seq owned by demo.history.id;
select setval('demo.history_id_seq', coalesce((select max(id) from demo.history), 0) + 1, false);
alter table demo.history alter column id set default nextval('demo.history_id_seq');

-- Only the server (service role) reads and writes these, as with live
grant usage on schema demo to service_role;
grant all on all tables in schema demo to service_role;
grant all on all sequences in schema demo to service_role;
grant execute on all functions in schema demo to service_role;
