-- Let an active owner restore an archived listing they previously removed.
create or replace function public.restore_my_listing(p_listing_id uuid)
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
  set status = 'published', updated_at = now(), row_version = row_version + 1
  where id = p_listing_id
    and owner_id = auth.uid()
    and status = 'archived';

  if not found then
    raise exception 'LISTING_NOT_FOUND_OR_ARCHIVED';
  end if;
end;
$$;

revoke all on function public.restore_my_listing(uuid) from public, anon;
grant execute on function public.restore_my_listing(uuid) to authenticated;
