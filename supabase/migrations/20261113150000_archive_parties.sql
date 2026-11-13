-- Archived customers / suppliers: hidden from lists and pickers, but their invoices, purchases and receipts
-- keep pointing at them (they cannot be deleted while anything is linked).
alter table customers add column archived boolean not null default false;
alter table suppliers add column archived boolean not null default false;
