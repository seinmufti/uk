-- Accounts for the live app. People sign up with an email, a username and a password; the account
-- waits ("pending") until the admin approves it from the email link or the Accounts page. They then
-- sign in with the username and password. Passwords are stored only as scrypt hashes.
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index users_email_key on users (lower(email));
create unique index users_username_key on users (lower(username));

-- Only the server (service role) reads this table
alter table users enable row level security;
