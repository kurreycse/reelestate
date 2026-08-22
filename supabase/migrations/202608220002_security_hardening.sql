-- Defense-in-depth controls for privileged access, public data, identity fields,
-- anonymous analytics, and direct-to-storage uploads.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator','admin')
        and is_active
    );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
        and is_active
    );
$$;

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and role = 'poster'
  and phone_e164 = auth.jwt() ->> 'phone'
);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = 'poster'
  and phone_e164 = auth.jwt() ->> 'phone'
);

drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings
for insert to authenticated
with check (
  owner_id = auth.uid()
  and status in ('draft','pending_review')
  and video_path ~ (
    '^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](mp4|mov)$'
  )
);

-- Public visitors use explicit RPCs rather than selecting arbitrary listing
-- columns and internal reviewer/owner identifiers through PostgREST.
revoke select on public.listings from anon;

drop function if exists public.get_public_feed(text,text,text,text,text,bigint,bigint,timestamptz,uuid,integer);
create function public.get_public_feed(
  p_query text default null,
  p_purpose text default null,
  p_property_type text default null,
  p_city text default null,
  p_locality text default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_cursor_published_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 19
)
returns table (
  id uuid,
  title text,
  property_type text,
  purpose public.listing_purpose,
  price_minor bigint,
  currency character(3),
  city text,
  locality text,
  description text,
  contact_preference public.contact_preference,
  contact_phone text,
  status public.listing_status,
  video_path text,
  video_duration_seconds integer,
  poster_path text,
  published_at timestamptz,
  created_at timestamptz,
  furnishing_status text,
  ownership_type text,
  possession_status text,
  available_from date,
  security_deposit_minor bigint,
  maintenance_minor bigint,
  tenant_preference text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.title, l.property_type, l.purpose, l.price_minor, l.currency,
    l.city, l.locality, l.description, l.contact_preference, l.contact_phone,
    l.status, l.video_path, l.video_duration_seconds, l.poster_path,
    l.published_at, l.created_at, l.furnishing_status, l.ownership_type,
    l.possession_status, l.available_from, l.security_deposit_minor,
    l.maintenance_minor, l.tenant_preference
  from public.listings l
  where l.status = 'published'
    and char_length(coalesce(p_query, '')) <= 120
    and (nullif(trim(p_query), '') is null or
      lower(l.title || ' ' || l.locality || ' ' || l.city || ' ' || l.description)
        like '%' || lower(trim(p_query)) || '%')
    and (nullif(p_purpose, '') is null or l.purpose::text = p_purpose)
    and (nullif(p_property_type, '') is null or l.property_type = p_property_type)
    and (nullif(p_city, '') is null or l.city = p_city)
    and (nullif(p_locality, '') is null or l.locality = p_locality)
    and (p_min_price is null or l.price_minor >= p_min_price)
    and (p_max_price is null or l.price_minor <= p_max_price)
    and (
      p_cursor_published_at is null or p_cursor_id is null or
      (l.published_at, l.id) < (p_cursor_published_at, p_cursor_id)
    )
  order by l.published_at desc, l.id desc
  limit least(greatest(coalesce(p_limit, 19), 1), 25);
$$;

create or replace function public.get_public_localities(p_city text)
returns table(locality text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct l.locality
  from public.listings l
  where l.status = 'published'
    and l.city = left(p_city, 100)
    and trim(l.locality) <> ''
  order by l.locality;
$$;

revoke all on function public.get_public_feed(text,text,text,text,text,bigint,bigint,timestamptz,uuid,integer) from public;
revoke all on function public.get_public_localities(text) from public;
grant execute on function public.get_public_feed(text,text,text,text,text,bigint,bigint,timestamptz,uuid,integer) to anon, authenticated;
grant execute on function public.get_public_localities(text) to anon, authenticated;

-- Storage authorization helpers avoid granting public SELECT on the base table.
create or replace function public.can_read_property_video(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.video_path = p_name
      and (l.status = 'published' or l.owner_id = auth.uid() or public.is_staff())
  );
$$;

create or replace function public.can_read_property_poster(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.poster_path = p_name
      and (l.status = 'published' or l.owner_id = auth.uid() or public.is_staff())
  );
$$;

create or replace function public.can_upload_property_video(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select auth.uid() is not null
    and p_name ~ (
      '^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](mp4|mov)$'
    )
    and (
      select count(*) < 5
      from storage.objects o
      where o.bucket_id = 'property-videos'
        and (storage.foldername(o.name))[1] = auth.uid()::text
        and not exists (
          select 1 from public.listings l where l.video_path = o.name
        )
    );
$$;

revoke all on function public.can_read_property_video(text) from public;
revoke all on function public.can_read_property_poster(text) from public;
revoke all on function public.can_upload_property_video(text) from public;
grant execute on function public.can_read_property_video(text) to anon, authenticated;
grant execute on function public.can_read_property_poster(text) to anon, authenticated;
grant execute on function public.can_upload_property_video(text) to authenticated;

drop policy if exists video_owner_upload on storage.objects;
create policy video_owner_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'property-videos'
  and public.can_upload_property_video(name)
);

drop policy if exists video_owner_read_or_published on storage.objects;
create policy video_owner_read_or_published on storage.objects
for select
using (bucket_id = 'property-videos' and public.can_read_property_video(name));

drop policy if exists poster_owner_read_or_published on storage.objects;
create policy poster_owner_read_or_published on storage.objects
for select
using (bucket_id = 'property-posters' and public.can_read_property_poster(name));

-- Direct anonymous analytics writes are disabled until a rate-limited ingestion
-- function is introduced.
drop policy if exists engagement_insert on public.engagement_events;
revoke insert on public.engagement_events from anon, authenticated;

-- Security-definer functions should never inherit default PUBLIC execution.
revoke all on function public.moderate_listing(uuid,text,text,text) from public;
grant execute on function public.moderate_listing(uuid,text,text,text) to authenticated;
