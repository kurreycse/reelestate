-- ReelEstate Phase 1 schema, RLS, storage and moderation workflow.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('poster','moderator','admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.listing_status as enum ('draft','uploading','pending_review','approved','rejected','published','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.listing_purpose as enum ('sale','rent');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.contact_preference as enum ('call','whatsapp','both');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null check (char_length(email) <= 254),
  phone_e164 text unique,
  role public.app_role not null default 'poster',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  property_type text not null check (char_length(property_type) between 2 and 60),
  purpose public.listing_purpose not null,
  price_minor bigint not null check (price_minor > 0),
  currency char(3) not null default 'INR',
  city text not null check (char_length(city) between 2 and 100),
  locality text not null check (char_length(locality) between 2 and 150),
  description text not null check (char_length(description) between 20 and 2000),
  contact_preference public.contact_preference not null default 'both',
  contact_phone text not null check (char_length(contact_phone) between 8 and 20),
  status public.listing_status not null default 'draft',
  video_path text not null,
  video_duration_seconds integer not null check (video_duration_seconds between 1 and 60),
  poster_path text,
  rejection_category text,
  rejection_note text,
  moderator_id uuid references auth.users(id),
  moderated_at timestamptz,
  published_at timestamptz,
  row_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rejection_requires_reason check (status <> 'rejected' or (rejection_category is not null and char_length(rejection_note) >= 10)),
  constraint publication_requires_moderator check (status <> 'published' or (moderator_id is not null and published_at is not null))
);

create table if not exists public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approve','reject','archive')),
  category text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.engagement_events (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_type text not null check (event_type in ('impression','play','complete','share','call','whatsapp')),
  anonymous_session_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists listings_public_feed_idx on public.listings (published_at desc, id desc) where status = 'published';
create index if not exists listings_owner_idx on public.listings (owner_id, updated_at desc);
create index if not exists listings_review_idx on public.listings (created_at asc) where status = 'pending_review';
create index if not exists moderation_listing_idx on public.moderation_decisions (listing_id, created_at desc);
create index if not exists engagement_listing_idx on public.engagement_events (listing_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); new.row_version = coalesce(old.row_version, 0) + 1; return new; end $$;
drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('moderator','admin') and is_active); $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active); $$;

create or replace function public.moderate_listing(p_listing_id uuid, p_decision text, p_category text default null, p_note text default null)
returns public.listings language plpgsql security definer set search_path = public as $$
declare before_row public.listings; after_row public.listings;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approve','reject') then raise exception 'INVALID_DECISION'; end if;
  select * into before_row from public.listings where id = p_listing_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if before_row.status <> 'pending_review' then raise exception 'STATE_CONFLICT'; end if;
  if p_decision = 'reject' and (p_category is null or char_length(coalesce(p_note,'')) < 10) then raise exception 'REJECTION_REASON_REQUIRED'; end if;
  update public.listings set
    status = case when p_decision='approve' then 'published'::public.listing_status else 'rejected'::public.listing_status end,
    moderator_id = auth.uid(), moderated_at = now(),
    published_at = case when p_decision='approve' then now() else null end,
    rejection_category = case when p_decision='reject' then p_category else null end,
    rejection_note = case when p_decision='reject' then p_note else null end
  where id = p_listing_id returning * into after_row;
  insert into public.moderation_decisions(listing_id,reviewer_id,decision,category,note) values(p_listing_id,auth.uid(),p_decision,p_category,p_note);
  insert into public.audit_log(actor_id,action,target_type,target_id,before_data,after_data) values(auth.uid(),'listing.'||p_decision,'listing',p_listing_id,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.moderation_decisions enable row level security;
alter table public.engagement_events enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid() and role = 'poster');
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'poster');

drop policy if exists listings_public_or_authorized_select on public.listings;
create policy listings_public_or_authorized_select on public.listings for select using (status = 'published' or owner_id = auth.uid() or public.is_staff());
drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings for insert with check (owner_id = auth.uid() and status in ('draft','pending_review'));
drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and status not in ('approved','published'));

drop policy if exists moderation_owner_or_staff_select on public.moderation_decisions;
create policy moderation_owner_or_staff_select on public.moderation_decisions for select using (public.is_staff() or exists(select 1 from public.listings l where l.id=listing_id and l.owner_id=auth.uid()));
drop policy if exists engagement_insert on public.engagement_events;
create policy engagement_insert on public.engagement_events for insert with check (exists(select 1 from public.listings l where l.id=listing_id and l.status='published'));
drop policy if exists audit_staff_select on public.audit_log;
create policy audit_staff_select on public.audit_log for select using (public.is_staff());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('property-videos','property-videos',false,209715200,array['video/mp4','video/quicktime'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('property-posters','property-posters',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists video_owner_upload on storage.objects;
create policy video_owner_upload on storage.objects for insert to authenticated with check (bucket_id='property-videos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists video_owner_read_or_published on storage.objects;
create policy video_owner_read_or_published on storage.objects for select using (bucket_id='property-videos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_staff() or exists(select 1 from public.listings l where l.video_path=name and l.status='published')));
drop policy if exists video_owner_delete on storage.objects;
create policy video_owner_delete on storage.objects for delete to authenticated using (bucket_id='property-videos' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.listings l where l.video_path=name and l.status='published'));
drop policy if exists poster_owner_upload on storage.objects;
create policy poster_owner_upload on storage.objects for insert to authenticated with check (bucket_id='property-posters' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists poster_owner_read_or_published on storage.objects;
create policy poster_owner_read_or_published on storage.objects for select using (bucket_id='property-posters' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_staff() or exists(select 1 from public.listings l where l.poster_path=name and l.status='published')));

grant execute on function public.moderate_listing(uuid,text,text,text) to authenticated;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- After creating the first administrator in Supabase Auth, promote them once:
-- update public.profiles set role='admin' where id='<ADMIN_USER_UUID>';
