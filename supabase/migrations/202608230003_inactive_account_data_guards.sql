drop policy if exists enquiries_owner_select on public.property_enquiries;
create policy enquiries_owner_select on public.property_enquiries for select to authenticated
using ((owner_id=auth.uid() and public.is_active_user()) or public.is_staff());

drop policy if exists enquiries_owner_status_update on public.property_enquiries;
create policy enquiries_owner_status_update on public.property_enquiries for update to authenticated
using (owner_id=auth.uid() and public.is_active_user())
with check (owner_id=auth.uid() and public.is_active_user());

create or replace function public.can_read_property_video(p_name text)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.listings l where l.video_path=p_name and (l.status='published' or (l.owner_id=auth.uid() and public.is_active_user()) or public.is_staff())); $$;

create or replace function public.can_read_property_poster(p_name text)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.listings l where l.poster_path=p_name and (l.status='published' or (l.owner_id=auth.uid() and public.is_active_user()) or public.is_staff())); $$;

drop policy if exists video_owner_delete on storage.objects;
create policy video_owner_delete on storage.objects for delete to authenticated
using(bucket_id='property-videos' and public.is_active_user() and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.listings l where l.video_path=name and l.status='published'));

drop policy if exists poster_owner_delete on storage.objects;
create policy poster_owner_delete on storage.objects for delete to authenticated
using(bucket_id='property-posters' and public.is_active_user() and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.listings l where l.poster_path=name and l.status='published'));
