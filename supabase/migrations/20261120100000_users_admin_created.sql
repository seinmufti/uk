-- Accounts are now created by the admin on the Accounts page (username + password); nobody signs up.
-- Email is no longer asked for.
alter table users alter column email drop not null;
alter table users alter column status set default 'approved';
