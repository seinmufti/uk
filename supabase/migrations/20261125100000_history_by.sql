-- Which account made each change (the app sends the username in the x-change-by header)
alter table public.history_changes add column if not exists by_user text;
alter table demo.history_changes add column if not exists by_user text;

do $$
declare s text;
begin
  foreach s in array array['public', 'demo'] loop
    execute format($f$
create or replace function %1$I.record_history() returns trigger
language plpgsql security definer set search_path = %1$I as $body$
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
  insert into history_changes (id, by_user) values (change, nullif(headers->>'x-change-by', '')) on conflict (id) do nothing;
  insert into history (change_id, tbl, op, row_id, old_row, new_row)
  values (change, tg_table_name, tg_op, coalesce(new_j->>'id', old_j->>'id'), old_j, new_j);
  return null;
end;
$body$;
$f$, s);
  end loop;
end;
$$;
