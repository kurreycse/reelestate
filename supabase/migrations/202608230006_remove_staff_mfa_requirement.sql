-- Staff authorization uses the authenticated account's assigned database role.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles
    where id=auth.uid() and role in ('moderator','admin') and is_active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles
    where id=auth.uid() and role='admin' and is_active);
$$;
