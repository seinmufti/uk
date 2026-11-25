-- The date a salary is to be paid (chosen per employee), and whether the employee is in this month's payroll
alter table public.payroll add column if not exists pay_date date;
alter table public.payroll add column if not exists included boolean not null default true;
alter table demo.payroll add column if not exists pay_date date;
alter table demo.payroll add column if not exists included boolean not null default true;
