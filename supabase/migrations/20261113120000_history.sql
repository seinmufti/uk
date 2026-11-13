-- History: every insert, update and delete on the app's tables, so changes can be undone and redone.
-- One "change" is everything a single action in the app did (the app sends the same x-change-id header
-- with each request of an action). Undo / redo send x-history-skip so they don't record themselves.

create table history_changes (
  id uuid primary key,
  at timestamptz not null default now(),
  undone boolean not null default false,
  undone_at timestamptz
);
create index history_changes_at_idx on history_changes (at desc);

create table history (
  id bigserial primary key,
  change_id uuid not null references history_changes(id) on delete cascade,
  at timestamptz not null default now(),
  tbl text not null,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  row_id text not null,
  old_row jsonb,
  new_row jsonb
);
create index history_change_idx on history (change_id, id);

alter table history_changes enable row level security;
alter table history enable row level security;

create or replace function record_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  change uuid;
  old_j jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_j jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if headers->>'x-history-skip' = '1' then
    return null;
  end if;
  -- Nothing really changed (or only the cached exchange rate): not worth a history line
  if tg_op = 'UPDATE' and (old_j = new_j or (tg_table_name = 'settings' and old_j - 'last_rate_per_100' = new_j - 'last_rate_per_100')) then
    return null;
  end if;
  change := coalesce((headers->>'x-change-id')::uuid, gen_random_uuid());
  insert into history_changes (id) values (change) on conflict (id) do nothing;
  insert into history (change_id, tbl, op, row_id, old_row, new_row)
  values (change, tg_table_name, tg_op, coalesce(new_j->>'id', old_j->>'id'), old_j, new_j);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'customers', 'suppliers', 'invoices', 'invoice_items', 'purchases', 'purchase_items', 'inventory_items',
    'debts', 'expenses', 'employees', 'leaves', 'absences', 'payroll', 'settings', 'receipts'
  ] loop
    execute format('create trigger %I after insert or update or delete on %I for each row execute function record_history()', t || '_history', t);
  end loop;
end;
$$;
