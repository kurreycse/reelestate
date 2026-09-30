create or replace function public.get_my_instagram_media_ids()
returns table(instagram_media_id text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'FORBIDDEN';
  end if;

  return query
    select distinct l.instagram_media_id
    from public.listings l
    where l.owner_id = auth.uid()
      and l.instagram_media_id is not null;
end;
$$;

revoke all on function public.get_my_instagram_media_ids() from public, anon;
grant execute on function public.get_my_instagram_media_ids() to authenticated;
