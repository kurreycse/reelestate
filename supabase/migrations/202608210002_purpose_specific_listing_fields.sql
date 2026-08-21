alter table public.listings
  add column if not exists furnishing_status text check (furnishing_status in ('unfurnished','semi_furnished','fully_furnished')),
  add column if not exists ownership_type text check (ownership_type in ('freehold','leasehold','power_of_attorney','cooperative_society')),
  add column if not exists possession_status text check (possession_status in ('ready_to_move','under_construction')),
  add column if not exists available_from date,
  add column if not exists security_deposit_minor bigint check (security_deposit_minor is null or security_deposit_minor >= 0),
  add column if not exists maintenance_minor bigint check (maintenance_minor is null or maintenance_minor >= 0),
  add column if not exists tenant_preference text check (tenant_preference in ('any','family','bachelor','company'));

comment on column public.listings.price_minor is 'Total sale price for sale listings; monthly rent for rent listings.';
comment on column public.listings.security_deposit_minor is 'Refundable security deposit for rent listings, stored in minor currency units.';
comment on column public.listings.maintenance_minor is 'Monthly maintenance charge for rent listings, stored in minor currency units.';
