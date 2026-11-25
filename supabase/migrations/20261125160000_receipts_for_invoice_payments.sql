-- Every payment on a customer invoice is a receipt: payments typed on invoices before receipts were made for
-- them get one now, dated the invoice date, for the invoice's customer, in the invoice's currency.
do $$
declare s text;
begin
  foreach s in array array['public', 'demo'] loop
    execute format($q$
      with gaps as (
        select i.id, i.date, i.customer_id, c.name as party,
          round((i.amount_paid_usd - coalesce((select sum(r.amount_usd) from %1$I.receipts r where r.invoice_id = i.id), 0))::numeric, 6) as gap,
          case when i.currency_mode = 'iqd' then 'iqd' else 'usd' end as currency,
          coalesce(nullif(i.rate_per_100, 0), (select last_rate_per_100 from %1$I.settings where id = 1)) as rate,
          row_number() over (order by i.date, i.number) as n
        from %1$I.invoices i
        left join %1$I.customers c on c.id = i.customer_id
      ),
      start as (
        -- Numbers never repeat: after the highest ever handed out (deleted receipts included)
        select greatest(
          coalesce((select max(number) from %1$I.receipts where kind = 'in'), 0),
          coalesce((select max((new_row->>'number')::int) from %1$I.history where tbl = 'receipts' and op = 'INSERT' and new_row->>'kind' = 'in'), 0)
        ) as base
      )
      insert into %1$I.receipts (kind, number, date, party, customer_id, amount_usd, currency, rate_per_100, method, invoice_id)
      select 'in', start.base + row_number() over (order by g.n), g.date, coalesce(g.party, '—'), g.customer_id, g.gap, g.currency, g.rate, 'cash', g.id
      from gaps g, start
      where g.gap > 0.005
    $q$, s);
  end loop;
end;
$$;
