alter table public.user_feedback add column if not exists mobile_e164 text check(mobile_e164 is null or mobile_e164 ~ '^\+[1-9][0-9]{7,14}$');
