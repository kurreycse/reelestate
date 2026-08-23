create or replace function public.get_my_listings()
returns setof public.listings
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'FORBIDDEN'; end if;
  return query select * from public.listings where owner_id=auth.uid() order by created_at desc;
end;
$$;
revoke all on function public.get_my_listings() from public,anon;
grant execute on function public.get_my_listings() to authenticated;
