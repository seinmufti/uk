-- Invoice lines get a unit cost; the line total is qty x cost. Older lines keep their total.
alter table invoice_items add column unit_price_usd numeric(14, 2);
update invoice_items set unit_price_usd = round(total_usd / nullif(qty, 0), 2) where unit_price_usd is null;
