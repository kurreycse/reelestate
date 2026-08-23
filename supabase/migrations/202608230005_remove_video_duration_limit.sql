-- Product policy no longer limits property videos to 60 seconds.
alter table public.listings
  drop constraint if exists listings_video_duration_seconds_check;

alter table public.listings
  add constraint listings_video_duration_seconds_positive
  check (video_duration_seconds >= 1);
