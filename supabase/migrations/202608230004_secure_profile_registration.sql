-- Complete phone registration without trusting browser-supplied identity fields.
create or replace function public.complete_phone_registration(
  p_first_name text,
  p_last_name text,
  p_email text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  verified_phone text;
  result public.profiles;
begin
  if auth.role() <> 'authenticated' or current_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select phone into verified_phone
  from auth.users
  where id = current_user_id
    and phone_confirmed_at is not null;

  if verified_phone is null then
    raise exception 'PHONE_NOT_VERIFIED' using errcode = '28000';
  end if;

  p_first_name := trim(p_first_name);
  p_last_name := trim(p_last_name);
  p_email := lower(trim(p_email));

  if char_length(p_first_name) not between 1 and 80
    or char_length(p_last_name) not between 1 and 80
    or char_length(p_email) > 254
    or p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$' collate "C"
  then
    raise exception 'INVALID_PROFILE' using errcode = '22023';
  end if;

  insert into public.profiles(id, first_name, last_name, email, phone_e164)
  values(current_user_id, p_first_name, p_last_name, p_email, verified_phone)
  on conflict(id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    updated_at = now()
  where profiles.phone_e164 = excluded.phone_e164
  returning * into result;

  if result.id is null then
    raise exception 'IDENTITY_MISMATCH' using errcode = '28000';
  end if;

  return result;
end;
$$;

revoke all on function public.complete_phone_registration(text,text,text) from public, anon;
grant execute on function public.complete_phone_registration(text,text,text) to authenticated;
