-- Allow owners to edit structured details at any listing stage.
-- Published edits return to review; archived and draft listings keep their stage.
create or replace function public.update_my_listing_details(
  p_listing_id uuid,
  p_data jsonb
)
returns public.listing_status
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status public.listing_status;
  price_value bigint;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'FORBIDDEN';
  end if;

  if p_data is null
    or length(trim(coalesce(p_data->>'title', ''))) not between 5 and 120
    or coalesce(p_data->>'property_type', '') not in ('Apartment', 'Villa', 'Independent house', 'Plot', 'Commercial')
    or coalesce(p_data->>'purpose', '') not in ('sale', 'rent')
    or coalesce(p_data->>'price_minor', '') !~ '^[1-9][0-9]{0,14}$'
    or length(trim(coalesce(p_data->>'city', ''))) not between 2 and 100
    or length(trim(coalesce(p_data->>'locality', ''))) not between 2 and 150
    or length(trim(coalesce(p_data->>'description', ''))) not between 20 and 2000
    or coalesce(p_data->>'contact_preference', '') not in ('call', 'whatsapp', 'both')
    or length(trim(coalesce(p_data->>'contact_phone', ''))) not between 8 and 20
    or coalesce(p_data->>'posted_by', '') not in ('owner', 'agent', 'builder')
  then
    raise exception 'INVALID_LISTING_DETAILS';
  end if;

  price_value := (p_data->>'price_minor')::bigint;
  if price_value <= 0
    or (nullif(p_data->>'bedrooms', '') is not null and (p_data->>'bedrooms') !~ '^(0|[1-9][0-9]?)$')
    or (nullif(p_data->>'bedrooms', '') is not null and (p_data->>'bedrooms')::integer > 20)
    or (nullif(p_data->>'bathrooms', '') is not null and (p_data->>'bathrooms') !~ '^(0|[1-9][0-9]?)$')
    or (nullif(p_data->>'bathrooms', '') is not null and (p_data->>'bathrooms')::integer > 20)
    or (nullif(p_data->>'carpet_area_sqft', '') is not null and (p_data->>'carpet_area_sqft') !~ '^[1-9][0-9]{0,6}$')
    or (nullif(p_data->>'builtup_area_sqft', '') is not null and (p_data->>'builtup_area_sqft') !~ '^[1-9][0-9]{0,6}$')
    or length(coalesce(p_data->>'project_name', '')) > 120
  then
    raise exception 'INVALID_LISTING_DETAILS';
  end if;

  update public.listings
  set title = trim(p_data->>'title'),
      property_type = p_data->>'property_type',
      purpose = (p_data->>'purpose')::public.listing_purpose,
      price_minor = price_value,
      city = trim(p_data->>'city'),
      locality = trim(p_data->>'locality'),
      description = trim(p_data->>'description'),
      contact_preference = (p_data->>'contact_preference')::public.contact_preference,
      contact_phone = trim(p_data->>'contact_phone'),
      bedrooms = nullif(p_data->>'bedrooms', '')::smallint,
      bathrooms = nullif(p_data->>'bathrooms', '')::smallint,
      carpet_area_sqft = nullif(p_data->>'carpet_area_sqft', '')::integer,
      builtup_area_sqft = nullif(p_data->>'builtup_area_sqft', '')::integer,
      project_name = nullif(trim(p_data->>'project_name'), ''),
      posted_by = p_data->>'posted_by',
      status = case when status in ('published', 'rejected', 'approved') then 'pending_review'::public.listing_status else status end,
      published_at = case when status = 'published' then null else published_at end,
      moderator_id = case when status in ('published', 'rejected', 'approved') then null else moderator_id end,
      moderated_at = case when status in ('published', 'rejected', 'approved') then null else moderated_at end,
      rejection_category = case when status = 'rejected' then null else rejection_category end,
      rejection_note = case when status = 'rejected' then null else rejection_note end,
      row_version = row_version + 1,
      updated_at = now()
  where id = p_listing_id
    and owner_id = auth.uid()
  returning status into next_status;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  return next_status;
end;
$$;

revoke all on function public.update_my_listing_details(uuid, jsonb) from public, anon;
grant execute on function public.update_my_listing_details(uuid, jsonb) to authenticated;
