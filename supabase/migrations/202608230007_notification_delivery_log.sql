create table if not exists public.notification_deliveries(
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_type text not null check(event_type in ('listing_submitted','listing_approved','listing_rejected')),
  channel text not null check(channel in ('email','sms')),
  recipient_hash text not null,
  status text not null check(status in ('sent','failed','skipped')),
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  unique(listing_id,event_type,channel,recipient_hash)
);
alter table public.notification_deliveries enable row level security;
revoke all on public.notification_deliveries from anon,authenticated;
create policy notification_staff_read on public.notification_deliveries for select to authenticated using(public.is_staff());
grant select on public.notification_deliveries to authenticated;
