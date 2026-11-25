-- HR is in IQD only: salaries, payroll rows and bonuses / deductions. The USD amounts stay the same value;
-- a record without a rate gets the last known rate.
do $$
declare s text;
begin
  foreach s in array array['public', 'demo'] loop
    execute format($q$
      update %1$I.employees set salary_currency = 'iqd',
        salary_rate = coalesce(salary_rate, (select nullif(last_rate_per_100, 0) from %1$I.settings where id = 1))
      where salary_currency <> 'iqd' or salary_rate is null;
      update %1$I.payroll p set currency = 'iqd',
        rate_per_100 = coalesce(p.rate_per_100, e.salary_rate)
      from %1$I.employees e
      where e.id = p.employee_id and (p.currency <> 'iqd' or p.rate_per_100 is null);
      update %1$I.payroll_items i set currency = 'iqd',
        rate_per_100 = coalesce(i.rate_per_100, p.rate_per_100)
      from %1$I.payroll p
      where p.id = i.payroll_id and (i.currency <> 'iqd' or i.rate_per_100 is null);
      alter table %1$I.employees alter column salary_currency set default 'iqd';
      alter table %1$I.payroll alter column currency set default 'iqd';
      alter table %1$I.payroll_items alter column currency set default 'iqd';
    $q$, s);
  end loop;
end;
$$;
