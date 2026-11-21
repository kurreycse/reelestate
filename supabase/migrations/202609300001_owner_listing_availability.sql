-- Let an active listing owner take their own published listing offline.
-- Listing writes are otherwise revoked from authenticated users.
create or replace function public.mark_my_listing_unavailable(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'FORBIDDEN';
  end if;

  update public.listings
  set status = 'archived', updated_at = now()
  where id = p_listing_id
    and owner_id = auth.uid()
    and status = 'published';

  if not found then
    raise exception 'LISTING_NOT_FOUND_OR_NOT_PUBLISHED';
  end if;
end;
$$;

revoke all on function public.mark_my_listing_unavailable(uuid) from public, anon;
grant execute on function public.mark_my_listing_unavailable(uuid) to authenticated;
