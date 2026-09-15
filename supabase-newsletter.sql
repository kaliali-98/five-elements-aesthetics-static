create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  status text not null default 'pending',
  confirmation_token text,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups
  add column if not exists status text not null default 'pending',
  add column if not exists confirmation_token text,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmed_at timestamptz;

create index if not exists newsletter_signups_confirmation_token_idx
on public.newsletter_signups (confirmation_token);

alter table public.newsletter_signups enable row level security;

drop policy if exists "Allow public newsletter signups" on public.newsletter_signups;
create policy "Allow public newsletter signups"
on public.newsletter_signups
for insert
to anon
with check (
  email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);

drop policy if exists "Allow public newsletter updates by email" on public.newsletter_signups;
create policy "Allow public newsletter updates by email"
on public.newsletter_signups
for update
to anon
using (
  email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
)
with check (
  email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);
