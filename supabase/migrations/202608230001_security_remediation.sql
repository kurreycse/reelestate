-- Security remediation: least-privilege data access, atomic abuse controls,
-- protected listing creation, active-account enforcement and PII retention.

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id=auth.uid() and is_active);
$$;
revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

-- Posters may edit only ordinary profile fields. Role and activation state are
-- administrative fields and cannot be self-restored after a suspension.
revoke update on public.profiles from authenticated;
grant update (first_name,last_name,email) on public.profiles to authenticated;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
using (id=auth.uid() and public.is_active_user())
with check (id=auth.uid() and role='poster' and phone_e164=auth.jwt()->>'phone' and is_active);

-- All listing writes now pass through privileged, validating interfaces.
revoke insert, update, delete on public.listings from authenticated;
drop policy if exists listings_owner_insert on public.listings;
drop policy if exists listings_owner_update on public.listings;

-- Do not let a normal authenticated account bypass the public projection and
-- enumerate internal owner/moderator fields from every published row.
revoke select on public.listings from authenticated;

create or replace function public.get_my_listings()
returns setof public.listings
language sql stable security definer set search_path = public
as $$
  select * from public.listings
  where owner_id=auth.uid() and public.is_active_user()
  order by created_at desc;
$$;

create or replace function public.get_staff_review_queue()
returns setof public.listings
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  return query select * from public.listings where status='pending_review' order by created_at;
end;
$$;

create or replace function public.get_staff_listing_performance()
returns table(
  id uuid,title text,status public.listing_status,view_count bigint,
  completion_count bigint,share_count bigint,call_count bigint,
  whatsapp_count bigint,created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  return query select l.id,l.title,l.status,l.view_count,l.completion_count,
    l.share_count,l.call_count,l.whatsapp_count,l.created_at
  from public.listings l order by l.view_count desc limit 500;
end;
$$;

revoke all on function public.get_my_listings() from public;
revoke all on function public.get_staff_review_queue() from public;
revoke all on function public.get_staff_listing_performance() from public;
grant execute on function public.get_my_listings() to authenticated;
grant execute on function public.get_staff_review_queue() to authenticated;
grant execute on function public.get_staff_listing_performance() to authenticated;

-- Service-only listing finalization. The Edge Function validates storage media
-- and then calls this routine; user-controlled system fields are never accepted.
create or replace function public.create_validated_listing(p_owner_id uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid := (p_data->>'id')::uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.profiles where id=p_owner_id and is_active) then raise exception 'ACCOUNT_INACTIVE'; end if;
  insert into public.listings(
    id,owner_id,title,property_type,purpose,price_minor,currency,city,locality,
    description,contact_preference,contact_phone,status,video_path,
    video_duration_seconds,poster_path,furnishing_status,ownership_type,
    possession_status,available_from,security_deposit_minor,maintenance_minor,
    tenant_preference,bedrooms,bathrooms,carpet_area_sqft,builtup_area_sqft,
    property_age_years,floor_number,total_floors,parking_spaces,facing,
    project_name,posted_by,amenities
  ) values (
    new_id,p_owner_id,trim(p_data->>'title'),p_data->>'property_type',(p_data->>'purpose')::public.listing_purpose,
    (p_data->>'price_minor')::bigint,'INR',trim(p_data->>'city'),trim(p_data->>'locality'),
    trim(p_data->>'description'),(p_data->>'contact_preference')::public.contact_preference,
    trim(p_data->>'contact_phone'),'pending_review',p_data->>'video_path',
    (p_data->>'video_duration_seconds')::integer,p_data->>'poster_path',
    nullif(p_data->>'furnishing_status',''),nullif(p_data->>'ownership_type',''),
    nullif(p_data->>'possession_status',''),nullif(p_data->>'available_from','')::date,
    nullif(p_data->>'security_deposit_minor','')::bigint,nullif(p_data->>'maintenance_minor','')::bigint,
    nullif(p_data->>'tenant_preference',''),nullif(p_data->>'bedrooms','')::smallint,
    nullif(p_data->>'bathrooms','')::smallint,nullif(p_data->>'carpet_area_sqft','')::integer,
    nullif(p_data->>'builtup_area_sqft','')::integer,nullif(p_data->>'property_age_years','')::smallint,
    nullif(p_data->>'floor_number','')::smallint,nullif(p_data->>'total_floors','')::smallint,
    nullif(p_data->>'parking_spaces','')::smallint,nullif(p_data->>'facing',''),
    nullif(trim(p_data->>'project_name'),''),p_data->>'posted_by',
    coalesce(array(select jsonb_array_elements_text(p_data->'amenities')),'{}')
  );
  return new_id;
end;
$$;
revoke all on function public.create_validated_listing(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_validated_listing(uuid,jsonb) to service_role;

-- Atomic fixed-window limiter used only by service-role Edge Functions.
create table if not exists public.rate_limit_buckets(
  bucket_key text primary key,
  request_count integer not null check(request_count>0),
  window_started_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon,authenticated;

create or replace function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare current_count integer;
begin
  if auth.role()<>'service_role' or char_length(p_key)>160 or p_limit<1 or p_window_seconds<1 then raise exception 'FORBIDDEN'; end if;
  insert into public.rate_limit_buckets(bucket_key,request_count,window_started_at)
  values(p_key,1,now())
  on conflict(bucket_key) do update set
    request_count=case when rate_limit_buckets.window_started_at<now()-make_interval(secs=>p_window_seconds) then 1 else rate_limit_buckets.request_count+1 end,
    window_started_at=case when rate_limit_buckets.window_started_at<now()-make_interval(secs=>p_window_seconds) then now() else rate_limit_buckets.window_started_at end,
    updated_at=now()
  returning request_count into current_count;
  return current_count<=p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

-- Owners may remove their own leads, and scheduled retention removes stale PII.
grant delete on public.property_enquiries to authenticated;
create policy enquiries_owner_delete on public.property_enquiries for delete to authenticated
using(owner_id=auth.uid() and public.is_active_user());

create or replace function public.purge_expired_private_data()
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.property_enquiries where created_at<now()-interval '180 days';
  delete from public.publisher_interests where created_at<now()-interval '180 days';
  delete from public.rate_limit_buckets where updated_at<now()-interval '2 days';
  delete from public.engagement_events where created_at<now()-interval '400 days';
end;
$$;
revoke all on function public.purge_expired_private_data() from public,anon,authenticated;
grant execute on function public.purge_expired_private_data() to service_role;

create extension if not exists pg_cron with schema extensions;
do $$ begin
  perform cron.unschedule('reelestate-private-data-retention');
exception when others then null; end $$;
select cron.schedule('reelestate-private-data-retention','17 2 * * *','select public.purge_expired_private_data()');

-- Active-account enforcement and orphan quotas for both private media buckets.
create or replace function public.can_upload_property_video(p_name text)
returns boolean language sql stable security definer set search_path=public,storage
as $$ select public.is_active_user() and p_name~('^'||auth.uid()::text||'/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](mp4|mov)$')
and (select count(*)<5 from storage.objects o where o.bucket_id='property-videos' and (storage.foldername(o.name))[1]=auth.uid()::text and not exists(select 1 from public.listings l where l.video_path=o.name)); $$;

create or replace function public.can_upload_property_poster(p_name text)
returns boolean language sql stable security definer set search_path=public,storage
as $$ select public.is_active_user() and p_name~('^'||auth.uid()::text||'/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]jpg$')
and (select count(*)<5 from storage.objects o where o.bucket_id='property-posters' and (storage.foldername(o.name))[1]=auth.uid()::text and not exists(select 1 from public.listings l where l.poster_path=o.name)); $$;
revoke all on function public.can_upload_property_poster(text) from public;
grant execute on function public.can_upload_property_poster(text) to authenticated;
drop policy if exists poster_owner_upload on storage.objects;
create policy poster_owner_upload on storage.objects for insert to authenticated
with check(bucket_id='property-posters' and public.can_upload_property_poster(name));

