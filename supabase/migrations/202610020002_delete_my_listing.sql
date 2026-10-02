-- Let an active owner permanently delete a listing they own.
-- Related enquiries, moderation decisions, engagement events, and notification
-- records use ON DELETE CASCADE foreign keys.
create or replace function public.delete_my_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.listings
  where id = p_listing_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.delete_my_listing(uuid) from public, anon;
grant execute on function public.delete_my_listing(uuid) to authenticated;
