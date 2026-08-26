create table if not exists public.user_feedback(
  id uuid primary key default gen_random_uuid(),rating smallint not null check(rating between 1 and 5),category text not null check(category in ('general','property_search','posting','account','bug')),
  message text not null check(char_length(message) between 3 and 2000),email text check(email is null or char_length(email)<=254),created_at timestamptz not null default now()
);
alter table public.user_feedback enable row level security;
revoke all on public.user_feedback from public,anon,authenticated;
