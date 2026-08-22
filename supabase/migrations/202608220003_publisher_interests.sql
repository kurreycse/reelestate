create table if not exists public.publisher_interests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'),
  instagram_id text check (instagram_id is null or char_length(instagram_id) between 1 and 80),
  source text not null default 'website' check (source = 'website'),
  ip_hash text not null check (char_length(ip_hash) = 64),
  email_delivery_status text not null default 'pending'
    check (email_delivery_status in ('pending','sent','failed')),
  email_provider_id text,
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists publisher_interests_ip_rate_idx
  on public.publisher_interests (ip_hash, created_at desc);
create index if not exists publisher_interests_phone_idx
  on public.publisher_interests (phone_e164, created_at desc);

alter table public.publisher_interests enable row level security;
revoke all on public.publisher_interests from anon, authenticated;

comment on table public.publisher_interests is
  'Publisher-interest leads accepted only through the validated Edge Function; no direct browser table access.';
