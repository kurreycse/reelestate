create or replace function public.resubmit_validated_listing(p_owner_id uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare listing_id uuid:=(p_data->>'id')::uuid;
begin
  if auth.role()<>'service_role' then raise exception 'FORBIDDEN';end if;
  update public.listings set
    title=trim(p_data->>'title'),property_type=p_data->>'property_type',purpose=(p_data->>'purpose')::public.listing_purpose,
    price_minor=(p_data->>'price_minor')::bigint,city=trim(p_data->>'city'),locality=trim(p_data->>'locality'),description=trim(p_data->>'description'),
    contact_preference=(p_data->>'contact_preference')::public.contact_preference,contact_phone=trim(p_data->>'contact_phone'),
    video_path=p_data->>'video_path',poster_path=p_data->>'poster_path',video_duration_seconds=(p_data->>'video_duration_seconds')::integer,
    furnishing_status=nullif(p_data->>'furnishing_status',''),ownership_type=nullif(p_data->>'ownership_type',''),possession_status=nullif(p_data->>'possession_status',''),
    available_from=nullif(p_data->>'available_from','')::date,security_deposit_minor=nullif(p_data->>'security_deposit_minor','')::bigint,
    maintenance_minor=nullif(p_data->>'maintenance_minor','')::bigint,tenant_preference=nullif(p_data->>'tenant_preference',''),
    bedrooms=nullif(p_data->>'bedrooms','')::smallint,bathrooms=nullif(p_data->>'bathrooms','')::smallint,
    carpet_area_sqft=nullif(p_data->>'carpet_area_sqft','')::integer,builtup_area_sqft=nullif(p_data->>'builtup_area_sqft','')::integer,
    property_age_years=nullif(p_data->>'property_age_years','')::smallint,floor_number=nullif(p_data->>'floor_number','')::smallint,
    total_floors=nullif(p_data->>'total_floors','')::smallint,parking_spaces=nullif(p_data->>'parking_spaces','')::smallint,
    facing=nullif(p_data->>'facing',''),project_name=nullif(trim(p_data->>'project_name'),''),posted_by=p_data->>'posted_by',
    amenities=coalesce(array(select jsonb_array_elements_text(p_data->'amenities')),'{}'),status='pending_review',
    rejection_category=null,rejection_note=null,moderator_id=null,moderated_at=null,published_at=null,row_version=row_version+1,updated_at=now()
  where id=listing_id and owner_id=p_owner_id and status='rejected';
  if not found then raise exception 'RESUBMISSION_NOT_ALLOWED';end if;
  return listing_id;
end;$$;
revoke all on function public.resubmit_validated_listing(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.resubmit_validated_listing(uuid,jsonb) to service_role;

create or replace function public.can_replace_rejected_media(p_name text,p_bucket text)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_active_user() and exists(select 1 from public.listings l
  where l.owner_id=auth.uid() and l.status='rejected'
    and ((p_bucket='property-videos' and l.video_path=p_name) or (p_bucket='property-posters' and l.poster_path=p_name)));$$;
revoke all on function public.can_replace_rejected_media(text,text) from public;
grant execute on function public.can_replace_rejected_media(text,text) to authenticated;

drop policy if exists video_owner_replace_rejected on storage.objects;
create policy video_owner_replace_rejected on storage.objects for update to authenticated
using(bucket_id='property-videos' and public.can_replace_rejected_media(name,bucket_id))
with check(bucket_id='property-videos' and public.can_replace_rejected_media(name,bucket_id));
drop policy if exists poster_owner_replace_rejected on storage.objects;
create policy poster_owner_replace_rejected on storage.objects for update to authenticated
using(bucket_id='property-posters' and public.can_replace_rejected_media(name,bucket_id))
with check(bucket_id='property-posters' and public.can_replace_rejected_media(name,bucket_id));
