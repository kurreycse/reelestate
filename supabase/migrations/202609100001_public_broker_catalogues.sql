create unique index if not exists profiles_instagram_id_unique_idx
  on public.profiles (lower(instagram_id))
  where instagram_id is not null;

create or replace function public.get_public_broker_catalogue(p_instagram_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with broker as (
    select id, first_name, last_name, instagram_id
    from public.profiles
    where is_active
      and instagram_id is not null
      and lower(instagram_id) = lower(regexp_replace(trim(p_instagram_id), '^@', ''))
      and char_length(p_instagram_id) between 1 and 31
    limit 1
  ), catalogue as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'property_type', l.property_type,
      'purpose', l.purpose,
      'price_minor', l.price_minor,
      'currency', l.currency,
      'city', l.city,
      'locality', l.locality,
      'description', l.description,
      'contact_preference', l.contact_preference,
      'contact_phone', l.contact_phone,
      'video_path', l.video_path,
      'poster_path', l.poster_path,
      'published_at', l.published_at,
      'bedrooms', l.bedrooms,
      'bathrooms', l.bathrooms,
      'carpet_area_sqft', l.carpet_area_sqft,
      'furnishing_status', l.furnishing_status,
      'project_name', l.project_name,
      'posted_by', l.posted_by
    ) order by l.published_at desc), '[]'::jsonb) as listings
    from public.listings l
    join broker b on b.id = l.owner_id
    where l.status = 'published'
  )
  select case when b.id is null then null else jsonb_build_object(
    'name', trim(b.first_name || ' ' || b.last_name),
    'instagram_id', b.instagram_id,
    'listings', c.listings
  ) end
  from broker b cross join catalogue c;
$$;

revoke all on function public.get_public_broker_catalogue(text) from public;
grant execute on function public.get_public_broker_catalogue(text) to anon, authenticated;

