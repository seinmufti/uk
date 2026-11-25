-- Live only: receipt R-0001 was the payment for invoice #0003. Link it to that invoice
-- and drop R-0002, the receipt the backfill made for the same payment.
do $$
begin
  if exists (select 1 from public.receipts where id = '3901d002-3431-4526-96de-6c0194c1d9a8' and invoice_id is null)
     and exists (select 1 from public.receipts where id = '23680245-2c97-438c-a414-f30ed50d1387') then
    update public.receipts
      set invoice_id = 'baa998d6-ca49-463b-b7b7-ea1ea9c7f586', customer_id = '9be5e018-8b59-463b-84bb-8bfd342388f4'
      where id = '3901d002-3431-4526-96de-6c0194c1d9a8';
    delete from public.receipts where id = '23680245-2c97-438c-a414-f30ed50d1387';
  end if;
end;
$$;
