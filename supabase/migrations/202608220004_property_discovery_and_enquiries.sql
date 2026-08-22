alter table public.listings
  add column if not exists bedrooms smallint check (bedrooms is null or bedrooms between 0 and 20),
  add column if not exists bathrooms smallint check (bathrooms is null or bathrooms between 0 and 20),
  add column if not exists carpet_area_sqft integer check (carpet_area_sqft is null or carpet_area_sqft between 1 and 10000000),
  add column if not exists builtup_area_sqft integer check (builtup_area_sqft is null or builtup_area_sqft between 1 and 10000000),
  add column if not exists property_age_years smallint check (property_age_years is null or property_age_years between 0 and 200),
  add column if not exists floor_number smallint check (floor_number is null or floor_number between -5 and 200),
  add column if not exists total_floors smallint check (total_floors is null or total_floors between 0 and 200),
  add column if not exists parking_spaces smallint check (parking_spaces is null or parking_spaces between 0 and 50),
  add column if not exists facing text check (facing is null or facing in ('north','north_east','east','south_east','south','south_west','west','north_west')),
  add column if not exists project_name text check (project_name is null or char_length(project_name) between 2 and 120),
  add column if not exists posted_by text not null default 'owner' check (posted_by in ('owner','agent','builder')),
  add column if not exists amenities text[] not null default '{}';

-- Correct the original lead-validation expressions using unambiguous POSIX
-- character classes (the website now directs publisher interest to Google Forms).
alter table public.publisher_interests drop constraint if exists publisher_interests_phone_e164_check;
alter table public.publisher_interests add constraint publisher_interests_phone_e164_check check (phone_e164 ~ '^[+][1-9][0-9]{7,14}$');
alter table public.publisher_interests drop constraint if exists publisher_interests_email_check;
alter table public.publisher_interests add constraint publisher_interests_email_check check (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$');

create index if not exists listings_public_discovery_idx
  on public.listings (bedrooms, carpet_area_sqft, furnishing_status, posted_by, published_at desc, id desc)
  where status = 'published';

create table if not exists public.property_enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')),
  message text not null default '' check (char_length(message) <= 1000),
  preferred_visit_date date,
  status text not null default 'new' check (status in ('new','contacted','closed','spam')),
  ip_hash text not null check (char_length(ip_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_enquiries_owner_idx on public.property_enquiries (owner_id, created_at desc);
create index if not exists property_enquiries_rate_idx on public.property_enquiries (ip_hash, created_at desc);
create index if not exists property_enquiries_listing_idx on public.property_enquiries (listing_id, created_at desc);

alter table public.property_enquiries enable row level security;
revoke all on public.property_enquiries from anon, authenticated;
grant select on public.property_enquiries to authenticated;
grant update (status) on public.property_enquiries to authenticated;

create policy enquiries_owner_select on public.property_enquiries
for select to authenticated using (owner_id = auth.uid() or public.is_staff());
create policy enquiries_owner_status_update on public.property_enquiries
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop function if exists public.get_public_feed(text,text,text,text,text,bigint,bigint,timestamptz,uuid,integer);
create function public.get_public_feed(
  p_query text default null,
  p_purpose text default null,
  p_property_type text default null,
  p_city text default null,
  p_locality text default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_bedrooms integer default null,
  p_min_area integer default null,
  p_max_area integer default null,
  p_furnishing text default null,
  p_possession text default null,
  p_posted_by text default null,
  p_cursor_published_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 19
)
returns table (
  id uuid, title text, property_type text, purpose public.listing_purpose,
  price_minor bigint, currency character(3), city text, locality text,
  description text, contact_preference public.contact_preference,
  contact_phone text, status public.listing_status, video_path text,
  video_duration_seconds integer, poster_path text, published_at timestamptz,
  created_at timestamptz, furnishing_status text, ownership_type text,
  possession_status text, available_from date, security_deposit_minor bigint,
  maintenance_minor bigint, tenant_preference text, bedrooms smallint,
  bathrooms smallint, carpet_area_sqft integer, builtup_area_sqft integer,
  property_age_years smallint, floor_number smallint, total_floors smallint,
  parking_spaces smallint, facing text, project_name text, posted_by text,
  amenities text[]
)
language sql stable security definer set search_path = public
as $$
  select l.id, l.title, l.property_type, l.purpose, l.price_minor, l.currency,
    l.city, l.locality, l.description, l.contact_preference, l.contact_phone,
    l.status, l.video_path, l.video_duration_seconds, l.poster_path,
    l.published_at, l.created_at, l.furnishing_status, l.ownership_type,
    l.possession_status, l.available_from, l.security_deposit_minor,
    l.maintenance_minor, l.tenant_preference, l.bedrooms, l.bathrooms,
    l.carpet_area_sqft, l.builtup_area_sqft, l.property_age_years,
    l.floor_number, l.total_floors, l.parking_spaces, l.facing,
    l.project_name, l.posted_by, l.amenities
  from public.listings l
  where l.status = 'published'
    and char_length(coalesce(p_query, '')) <= 120
    and (nullif(trim(p_query), '') is null or lower(l.title || ' ' || l.locality || ' ' || l.city || ' ' || l.description || ' ' || coalesce(l.project_name,'')) like '%' || lower(trim(p_query)) || '%')
    and (nullif(p_purpose, '') is null or l.purpose::text = p_purpose)
    and (nullif(p_property_type, '') is null or l.property_type = p_property_type)
    and (nullif(p_city, '') is null or l.city = p_city)
    and (nullif(p_locality, '') is null or l.locality = p_locality)
    and (p_min_price is null or l.price_minor >= p_min_price)
    and (p_max_price is null or l.price_minor <= p_max_price)
    and (p_bedrooms is null or l.bedrooms = p_bedrooms)
    and (p_min_area is null or coalesce(l.carpet_area_sqft,l.builtup_area_sqft) >= p_min_area)
    and (p_max_area is null or coalesce(l.carpet_area_sqft,l.builtup_area_sqft) <= p_max_area)
    and (nullif(p_furnishing,'') is null or l.furnishing_status = p_furnishing)
    and (nullif(p_possession,'') is null or l.possession_status = p_possession)
    and (nullif(p_posted_by,'') is null or l.posted_by = p_posted_by)
    and (p_cursor_published_at is null or p_cursor_id is null or (l.published_at,l.id) < (p_cursor_published_at,p_cursor_id))
  order by l.published_at desc, l.id desc
  limit least(greatest(coalesce(p_limit,19),1),25);
$$;

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
    'project_name',l.project_name,'posted_by',l.posted_by,'amenities',l.amenities
  ) from public.listings l where l.id = p_listing_id and l.status = 'published';
$$;

revoke all on function public.get_public_feed(text,text,text,text,text,bigint,bigint,integer,integer,integer,text,text,text,timestamptz,uuid,integer) from public;
revoke all on function public.get_public_listing(uuid) from public;
grant execute on function public.get_public_feed(text,text,text,text,text,bigint,bigint,integer,integer,integer,text,text,text,timestamptz,uuid,integer) to anon, authenticated;
grant execute on function public.get_public_listing(uuid) to anon, authenticated;
