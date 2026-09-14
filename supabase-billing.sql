create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',
  subscription_status text not null default 'free',
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  free_trial_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount_total integer,
  currency text,
  plan text,
  status text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own payments" on public.payments;
create policy "Users can read their own payments"
on public.payments
for select
to authenticated
using ((select auth.uid()) = user_id);
