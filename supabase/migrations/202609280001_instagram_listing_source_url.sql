alter table public.listings
  add column if not exists instagram_source_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_instagram_source_url_valid'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_instagram_source_url_valid
      check (
        instagram_source_url is null
        or (
          char_length(instagram_source_url) <= 2048
          and instagram_source_url ~ '^https://(www\.)?instagram\.com/(reel|reels|p)/[A-Za-z0-9_-]+/?$'
        )
      );
  end if;
end;
$$;