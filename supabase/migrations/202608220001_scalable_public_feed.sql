-- Scalable public marketplace queries for large listing catalogues.
create extension if not exists pg_trgm;

create index if not exists listings_public_city_idx
  on public.listings (city, published_at desc, id desc)
  where status = 'published';
create index if not exists listings_public_locality_idx
  on public.listings (city, locality, published_at desc, id desc)
  where status = 'published';
create index if not exists listings_public_filters_idx
  on public.listings (purpose, property_type, price_minor, published_at desc, id desc)
  where status = 'published';
create index if not exists listings_public_search_idx
  on public.listings using gin (
    (lower(title || ' ' || locality || ' ' || city || ' ' || description)) gin_trgm_ops
  ) where status = 'published';

create or replace function public.get_public_feed(
  p_query text default null,
  p_purpose text default null,
  p_property_type text default null,
  p_city text default null,
  p_locality text default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_cursor_published_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 19
)
returns setof public.listings
language sql
stable
security invoker
set search_path = public
as $$
  select l.*
  from public.listings l
  where l.status = 'published'
    and (nullif(trim(p_query), '') is null or
      lower(l.title || ' ' || l.locality || ' ' || l.city || ' ' || l.description)
        like '%' || lower(trim(p_query)) || '%')
    and (nullif(p_purpose, '') is null or l.purpose::text = p_purpose)
    and (nullif(p_property_type, '') is null or l.property_type = p_property_type)
    and (nullif(p_city, '') is null or l.city = p_city)
    and (nullif(p_locality, '') is null or l.locality = p_locality)
    and (p_min_price is null or l.price_minor >= p_min_price)
    and (p_max_price is null or l.price_minor <= p_max_price)
    and (
      p_cursor_published_at is null or p_cursor_id is null or
      (l.published_at, l.id) < (p_cursor_published_at, p_cursor_id)
    )
  order by l.published_at desc, l.id desc
  limit least(greatest(coalesce(p_limit, 19), 1), 25);
$$;

create or replace function public.get_public_localities(p_city text)
returns table(locality text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct l.locality
  from public.listings l
  where l.status = 'published' and l.city = p_city and trim(l.locality) <> ''
  order by l.locality;
$$;

grant execute on function public.get_public_feed(text,text,text,text,text,bigint,bigint,timestamptz,uuid,integer) to anon, authenticated;
grant execute on function public.get_public_localities(text) to anon, authenticated;
