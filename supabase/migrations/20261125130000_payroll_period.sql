-- The period a salary is for: From (start of the month, or the hiring date if later) to To (end of the month
-- by default). It is paid on the To date. Replaces the single pay_date added earlier today.
do $$
declare s text;
begin
  foreach s in array array['public', 'demo'] loop
    execute format('alter table %I.payroll add column if not exists period_from date', s);
    execute format('alter table %I.payroll add column if not exists period_to date', s);
    execute format($f$
      update %1$I.payroll p set
        period_from = greatest(p.month, coalesce(e.start_date, p.month)),
        period_to = coalesce(p.pay_date, (p.month + interval '1 month' - interval '1 day')::date)
      from %1$I.employees e
      where e.id = p.employee_id and p.period_from is null
    $f$, s);
    execute format('alter table %I.payroll drop column if exists pay_date', s);
  end loop;
end;
$$;
