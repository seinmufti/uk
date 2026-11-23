-- Amounts typed in IQD stay IQD: each money record remembers the currency it was entered in and the rate
-- used, and keeps the USD figure to 6 decimals so the IQD amount comes back exactly (400,000 stays 400,000).
-- Amounts are still stored in USD, so totals, reports and the wallet keep working as before.
-- Done for live (public) and the demo (demo) alike.

do $$
declare s text;
begin
  foreach s in array array['public', 'demo'] loop
    -- Employees: the monthly salary
    execute format($q$alter table %I.employees
      add column if not exists salary_currency text not null default 'usd' check (salary_currency in ('usd', 'iqd')),
      add column if not exists salary_rate numeric(14, 2),
      alter column base_salary_usd type numeric(18, 6)$q$, s);
    -- A month's payroll row follows its employee's salary currency
    execute format($q$alter table %I.payroll
      add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd')),
      add column if not exists rate_per_100 numeric(14, 2),
      alter column base_usd type numeric(18, 6),
      alter column deductions_usd type numeric(18, 6),
      alter column bonuses_usd type numeric(18, 6)$q$, s);
    execute format($q$alter table %I.payroll_items alter column amount_usd type numeric(18, 6)$q$, s);
    -- Expenses, debts, holdings, receipts
    execute format($q$alter table %I.expenses
      add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd')),
      add column if not exists rate_per_100 numeric(14, 2),
      alter column amount_usd type numeric(18, 6)$q$, s);
    execute format($q$alter table %I.debts
      add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd')),
      add column if not exists rate_per_100 numeric(14, 2),
      alter column amount_usd type numeric(18, 6),
      alter column paid_usd type numeric(18, 6)$q$, s);
    execute format($q$alter table %I.inventory_items
      add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd')),
      add column if not exists rate_per_100 numeric(14, 2),
      alter column value_usd type numeric(18, 6)$q$, s);
    execute format($q$alter table %I.receipts
      add column if not exists currency text not null default 'usd' check (currency in ('usd', 'iqd')),
      alter column amount_usd type numeric(18, 6)$q$, s);
  end loop;
end;
$$;
