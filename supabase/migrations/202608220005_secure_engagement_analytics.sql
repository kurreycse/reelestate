alter table public.listings
  add column if not exists view_count bigint not null default 0 check (view_count >= 0),
  add column if not exists completion_count bigint not null default 0 check (completion_count >= 0),
  add column if not exists share_count bigint not null default 0 check (share_count >= 0),
  add column if not exists call_count bigint not null default 0 check (call_count >= 0),
  add column if not exists whatsapp_count bigint not null default 0 check (whatsapp_count >= 0);

alter table public.engagement_events
  add column if not exists ip_hash text,
  add column if not exists dedupe_window_start timestamptz;

alter table public.engagement_events drop constraint if exists engagement_events_ip_hash_check;
alter table public.engagement_events add constraint engagement_events_ip_hash_check
  check (ip_hash is null or char_length(ip_hash) = 64);

create unique index if not exists engagement_daily_unique_idx
  on public.engagement_events (listing_id, event_type, anonymous_session_hash, dedupe_window_start)
  where anonymous_session_hash is not null and dedupe_window_start is not null;
create index if not exists engagement_ip_rate_idx
  on public.engagement_events (ip_hash, created_at desc) where ip_hash is not null;

create or replace function public.record_engagement_event(
  p_listing_id uuid,
  p_event_type text,
  p_session_hash text,
  p_ip_hash text
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  inserted_count integer;
  window_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if p_event_type not in ('play','complete','share','call','whatsapp')
    or char_length(p_session_hash) <> 64 or char_length(p_ip_hash) <> 64 then
    raise exception 'invalid engagement event';
  end if;

  insert into public.engagement_events
    (listing_id,event_type,anonymous_session_hash,ip_hash,dedupe_window_start)
  select p_listing_id,p_event_type,p_session_hash,p_ip_hash,window_start
  where exists (select 1 from public.listings where id=p_listing_id and status='published')
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    update public.listings set
      view_count = view_count + case when p_event_type='play' then 1 else 0 end,
      completion_count = completion_count + case when p_event_type='complete' then 1 else 0 end,
      share_count = share_count + case when p_event_type='share' then 1 else 0 end,
      call_count = call_count + case when p_event_type='call' then 1 else 0 end,
      whatsapp_count = whatsapp_count + case when p_event_type='whatsapp' then 1 else 0 end
    where id=p_listing_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.record_engagement_event(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_engagement_event(uuid,text,text,text) to service_role;

create or replace function public.get_public_view_counts(p_listing_ids uuid[])
returns table (listing_id uuid, view_count bigint)
language sql stable security definer set search_path = public
as $$
  select l.id,l.view_count from public.listings l
  where l.status='published' and l.id=any(p_listing_ids)
  limit 25;
$$;
revoke all on function public.get_public_view_counts(uuid[]) from public;
grant execute on function public.get_public_view_counts(uuid[]) to anon, authenticated;

create or replace function public.get_public_listing(p_listing_id uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id',l.id,'title',l.title,'property_type',l.property_type,'purpose',l.purpose,
    'price_minor',l.price_minor,'currency',l.currency,'city',l.city,'locality',l.locality,
    'description',l.description,'contact_preference',l.contact_preference,'contact_phone',l.contact_phone,
    'status',l.status,'video_path',l.video_path,'video_duration_seconds',l.video_duration_seconds,
    'poster_path',l.poster_path,'published_at',l.published_at,'created_at',l.created_at,
    'furnishing_status',l.furnishing_status,'ownership_type',l.ownership_type,
    'possession_status',l.possession_status,'available_from',l.available_from,
    'security_deposit_minor',l.security_deposit_minor,'maintenance_minor',l.maintenance_minor,
    'tenant_preference',l.tenant_preference,'bedrooms',l.bedrooms,'bathrooms',l.bathrooms,
    'carpet_area_sqft',l.carpet_area_sqft,'builtup_area_sqft',l.builtup_area_sqft,
    'property_age_years',l.property_age_years,'floor_number',l.floor_number,
    'total_floors',l.total_floors,'parking_spaces',l.parking_spaces,'facing',l.facing,
    'project_name',l.project_name,'posted_by',l.posted_by,'amenities',l.amenities,
    'view_count',l.view_count
  ) from public.listings l where l.id = p_listing_id and l.status = 'published';
$$;
revoke all on function public.get_public_listing(uuid) from public;
grant execute on function public.get_public_listing(uuid) to anon, authenticated;

