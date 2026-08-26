create or replace function public.update_my_profile(p_first_name text,p_last_name text,p_email text,p_instagram_id text)
returns public.profiles language plpgsql security definer set search_path=public as $$
declare normalized_instagram text:=nullif(regexp_replace(trim(coalesce(p_instagram_id,'')),'^@',''),'');result public.profiles;
begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'UNAUTHENTICATED' using errcode='28000';end if;
  p_first_name:=trim(p_first_name);p_last_name:=trim(p_last_name);p_email:=lower(trim(p_email));
  if char_length(p_first_name) not between 1 and 80 or char_length(p_last_name) not between 1 and 80 or char_length(p_email)>254
    or p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$' collate "C"
    or (normalized_instagram is not null and normalized_instagram !~ '^[A-Za-z0-9._]{1,30}$')
  then raise exception 'INVALID_PROFILE' using errcode='22023';end if;
  update public.profiles set first_name=p_first_name,last_name=p_last_name,email=p_email,instagram_id=normalized_instagram,updated_at=now()
    where id=auth.uid() returning * into result;
  if result.id is null then raise exception 'PROFILE_NOT_FOUND';end if;return result;
end;$$;
revoke all on function public.update_my_profile(text,text,text,text) from public,anon;
grant execute on function public.update_my_profile(text,text,text,text) to authenticated;
