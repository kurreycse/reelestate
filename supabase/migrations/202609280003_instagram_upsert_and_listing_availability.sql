alter table public.listings
  add column if not exists is_available boolean not null default true;

do $$
declare duplicate_row record;
begin
  if exists (
    select 1
    from public.listings
    where instagram_media_id is not null
    group by instagram_media_id
    having count(distinct owner_id) > 1
  ) then
    raise exception 'INSTAGRAM_MEDIA_ID_HAS_MULTIPLE_OWNERS';
  end if;

  for duplicate_row in
    with ranked as (
      select id,
        first_value(id) over (
          partition by instagram_media_id, owner_id
          order by (status = 'published') desc, (status = 'approved') desc,
            updated_at desc, created_at asc, id
        ) as keeper_id,
        row_number() over (
          partition by instagram_media_id, owner_id
          order by (status = 'published') desc, (status = 'approved') desc,
            updated_at desc, created_at asc, id
        ) as row_number
      from public.listings
      where instagram_media_id is not null
    )
    select id as duplicate_id, keeper_id
    from ranked
    where row_number > 1
  loop
    update public.property_enquiries
      set listing_id = duplicate_row.keeper_id
      where listing_id = duplicate_row.duplicate_id;
    update public.moderation_decisions
      set listing_id = duplicate_row.keeper_id
      where listing_id = duplicate_row.duplicate_id;
    update public.engagement_events
      set listing_id = duplicate_row.keeper_id
      where listing_id = duplicate_row.duplicate_id;

    update public.notification_deliveries kept
      set status = case
            when duplicate.status = 'sent' or kept.status = 'sent' then 'sent'
            when duplicate.status = 'failed' or kept.status = 'failed' then 'failed'
            else 'skipped'
          end,
          provider_id = coalesce(kept.provider_id, duplicate.provider_id),
          error_code = coalesce(kept.error_code, duplicate.error_code)
      from public.notification_deliveries duplicate
      where duplicate.listing_id = duplicate_row.duplicate_id
        and kept.listing_id = duplicate_row.keeper_id
        and kept.event_type = duplicate.event_type
        and kept.channel = duplicate.channel
        and kept.recipient_hash = duplicate.recipient_hash;
    delete from public.notification_deliveries duplicate
      where duplicate.listing_id = duplicate_row.duplicate_id
        and exists (
          select 1 from public.notification_deliveries kept
          where kept.listing_id = duplicate_row.keeper_id
            and kept.event_type = duplicate.event_type
            and kept.channel = duplicate.channel
            and kept.recipient_hash = duplicate.recipient_hash
        );
    update public.notification_deliveries
      set listing_id = duplicate_row.keeper_id
      where listing_id = duplicate_row.duplicate_id;
    delete from public.listings where id = duplicate_row.duplicate_id;
  end loop;
end;
$$;

create unique index if not exists listings_instagram_media_id_unique_idx
  on public.listings (instagram_media_id)
  where instagram_media_id is not null;

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
    project_name,posted_by,amenities,instagram_source_url,instagram_media_id
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
    coalesce(array(select jsonb_array_elements_text(p_data->'amenities')),'{}'),
    nullif(trim(p_data->>'instagram_source_url'),''),nullif(trim(p_data->>'instagram_media_id'),'')
  )
  on conflict (instagram_media_id) where instagram_media_id is not null
  do update set
    title=excluded.title,property_type=excluded.property_type,purpose=excluded.purpose,
    price_minor=excluded.price_minor,city=excluded.city,locality=excluded.locality,
    description=excluded.description,contact_preference=excluded.contact_preference,
    contact_phone=excluded.contact_phone,status='pending_review',video_path=null,
    video_duration_seconds=1,poster_path=null,furnishing_status=excluded.furnishing_status,
    ownership_type=excluded.ownership_type,possession_status=excluded.possession_status,
    available_from=excluded.available_from,security_deposit_minor=excluded.security_deposit_minor,
    maintenance_minor=excluded.maintenance_minor,tenant_preference=excluded.tenant_preference,
    bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,
    carpet_area_sqft=excluded.carpet_area_sqft,builtup_area_sqft=excluded.builtup_area_sqft,
    property_age_years=excluded.property_age_years,floor_number=excluded.floor_number,
    total_floors=excluded.total_floors,parking_spaces=excluded.parking_spaces,
    facing=excluded.facing,project_name=excluded.project_name,posted_by=excluded.posted_by,
    amenities=excluded.amenities,instagram_source_url=excluded.instagram_source_url,
    moderator_id=null,moderated_at=null,published_at=null,
    rejection_category=null,rejection_note=null,row_version=public.listings.row_version+1,
    updated_at=now()
  where public.listings.owner_id=p_owner_id
  returning id into new_id;
  if new_id is null then raise exception 'INSTAGRAM_REEL_ALREADY_LISTED_BY_ANOTHER_OWNER'; end if;
  return new_id;
end;
$$;

create or replace function public.set_my_listing_availability(p_listing_id uuid,p_is_available boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
declare affected integer;
begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'FORBIDDEN'; end if;
  update public.listings
    set is_available=p_is_available,updated_at=now(),row_version=row_version+1
    where id=p_listing_id and owner_id=auth.uid() and status='published';
  get diagnostics affected = row_count;
  if affected=0 then raise exception 'LISTING_NOT_FOUND_OR_NOT_PUBLISHED'; end if;
  return p_is_available;
end;
$$;
revoke all on function public.set_my_listing_availability(uuid,boolean) from public,anon;
grant execute on function public.set_my_listing_availability(uuid,boolean) to authenticated;

drop function if exists public.get_public_feed(text,text,text,text,text,bigint,bigint,integer,integer,integer,text,text,text,timestamptz,uuid,integer);
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
  amenities text[], instagram_source_url text, instagram_media_id text,
  is_available boolean
)
language sql stable security definer set search_path = public
as $$
  select l.id,l.title,l.property_type,l.purpose,l.price_minor,l.currency,
    l.city,l.locality,l.description,l.contact_preference,l.contact_phone,
    l.status,l.video_path,l.video_duration_seconds,l.poster_path,
    l.published_at,l.created_at,l.furnishing_status,l.ownership_type,
    l.possession_status,l.available_from,l.security_deposit_minor,
    l.maintenance_minor,l.tenant_preference,l.bedrooms,l.bathrooms,
    l.carpet_area_sqft,l.builtup_area_sqft,l.property_age_years,
    l.floor_number,l.total_floors,l.parking_spaces,l.facing,
    l.project_name,l.posted_by,l.amenities,l.instagram_source_url,
    l.instagram_media_id,l.is_available
  from public.listings l
  where l.status='published' and l.is_available
    and char_length(coalesce(p_query,''))<=120
    and (nullif(trim(p_query),'') is null or lower(l.title||' '||l.locality||' '||l.city||' '||l.description||' '||coalesce(l.project_name,'')) like '%'||lower(trim(p_query))||'%')
    and (nullif(p_purpose,'') is null or l.purpose::text=p_purpose)
    and (nullif(p_property_type,'') is null or l.property_type=p_property_type)
    and (nullif(p_city,'') is null or l.city=p_city)
    and (nullif(p_locality,'') is null or l.locality=p_locality)
    and (p_min_price is null or l.price_minor>=p_min_price)
    and (p_max_price is null or l.price_minor<=p_max_price)
    and (p_bedrooms is null or l.bedrooms=p_bedrooms)
    and (p_min_area is null or coalesce(l.carpet_area_sqft,l.builtup_area_sqft)>=p_min_area)
    and (p_max_area is null or coalesce(l.carpet_area_sqft,l.builtup_area_sqft)<=p_max_area)
    and (nullif(p_furnishing,'') is null or l.furnishing_status=p_furnishing)
    and (nullif(p_possession,'') is null or l.possession_status=p_possession)
    and (nullif(p_posted_by,'') is null or l.posted_by=p_posted_by)
    and (p_cursor_published_at is null or p_cursor_id is null or (l.published_at,l.id)<(p_cursor_published_at,p_cursor_id))
  order by l.published_at desc,l.id desc
  limit least(greatest(coalesce(p_limit,19),1),25);
$$;
revoke all on function public.get_public_feed(text,text,text,text,text,bigint,bigint,integer,integer,integer,text,text,text,timestamptz,uuid,integer) from public;
grant execute on function public.get_public_feed(text,text,text,text,text,bigint,bigint,integer,integer,integer,text,text,text,timestamptz,uuid,integer) to anon,authenticated;

create or replace function public.get_public_listing(p_listing_id uuid)
returns jsonb language sql stable security definer set search_path=public
as $$
  select jsonb_build_object(
    'id',l.id,'title',l.title,'property_type',l.property_type,'purpose',l.purpose,
    'price_minor',l.price_minor,'currency',l.currency,'city',l.city,'locality',l.locality,
    'description',l.description,'contact_preference',l.contact_preference,'contact_phone',l.contact_phone,
    'status',l.status,'video_path',l.video_path,'video_duration_seconds',l.video_duration_seconds,
    'poster_path',l.poster_path,'instagram_source_url',l.instagram_source_url,
    'instagram_media_id',l.instagram_media_id,'is_available',l.is_available,
    'published_at',l.published_at,'created_at',l.created_at,
    'furnishing_status',l.furnishing_status,'ownership_type',l.ownership_type,
    'possession_status',l.possession_status,'available_from',l.available_from,
    'security_deposit_minor',l.security_deposit_minor,'maintenance_minor',l.maintenance_minor,
    'tenant_preference',l.tenant_preference,'bedrooms',l.bedrooms,'bathrooms',l.bathrooms,
    'carpet_area_sqft',l.carpet_area_sqft,'builtup_area_sqft',l.builtup_area_sqft,
    'property_age_years',l.property_age_years,'floor_number',l.floor_number,
    'total_floors',l.total_floors,'parking_spaces',l.parking_spaces,'facing',l.facing,
    'project_name',l.project_name,'posted_by',l.posted_by,'amenities',l.amenities
  ) from public.listings l where l.id=p_listing_id and l.status='published' and l.is_available;
$$;
revoke all on function public.get_public_listing(uuid) from public;
grant execute on function public.get_public_listing(uuid) to anon,authenticated;

create or replace function public.get_public_localities(p_city text)
returns table(locality text)
language sql stable security definer set search_path=public
as $$
  select distinct l.locality from public.listings l
  where l.status='published' and l.is_available and l.city=left(p_city,100) and trim(l.locality)<>''
  order by l.locality;
$$;
revoke all on function public.get_public_localities(text) from public;
grant execute on function public.get_public_localities(text) to anon,authenticated;
