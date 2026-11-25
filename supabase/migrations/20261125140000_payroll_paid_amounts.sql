-- What was actually paid for a salary, in each currency as handed over, and a note
do $$
declare s text;
begin
  foreach s in array array['public', 'demo'] loop
    execute format('alter table %I.payroll add column if not exists paid_usd numeric(18, 6)', s);
    execute format('alter table %I.payroll add column if not exists paid_iqd numeric(18, 0)', s);
    execute format('alter table %I.payroll add column if not exists paid_note text', s);
  end loop;
end;
$$;
