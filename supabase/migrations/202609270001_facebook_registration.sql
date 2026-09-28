-- Derive new profiles from a server-verified Facebook identity, never client-supplied roles.
create or replace function public.complete_facebook_registration()
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  identity_data jsonb;
  account_email text;
  display_name text;
  result public.profiles;
begin
  if current_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  select i.identity_data into identity_data from auth.identities i
    where i.user_id = current_user_id and i.provider = 'facebook' limit 1;
  if identity_data is null then
    raise exception 'FACEBOOK_IDENTITY_REQUIRED' using errcode = '28000';
  end if;
  select * into result from public.profiles where id = current_user_id;
  if found then
    if not result.is_active then raise exception 'ACCOUNT_DISABLED' using errcode = '28000'; end if;
    return result; -- Preserve existing roles, verified phone numbers and profile edits.
  end if;
  select email into account_email from auth.users where id = current_user_id;
  if nullif(account_email, '') is null then raise exception 'EMAIL_REQUIRED'; end if;
  display_name := coalesce(nullif(trim(identity_data->>'full_name'), ''), nullif(trim(identity_data->>'name'), ''), 'Facebook User');
  insert into public.profiles(id, first_name, last_name, email, role)
    values(current_user_id, left(split_part(display_name, ' ', 1), 80),
      left(coalesce(nullif(trim(substr(display_name, length(split_part(display_name, ' ', 1)) + 1)), ''), 'User'), 80),
      account_email, 'poster')
    on conflict(id) do nothing;
  select * into result from public.profiles where id = current_user_id;
  if not result.is_active then raise exception 'ACCOUNT_DISABLED' using errcode = '28000'; end if;
  return result;
end;
$$;
revoke all on function public.complete_facebook_registration() from public, anon;
grant execute on function public.complete_facebook_registration() to authenticated;
