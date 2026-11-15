-- Preserve moderation history without retaining a deleted user's identity.
alter table public.listings
  drop constraint if exists listings_moderator_id_fkey;
alter table public.listings
  add constraint listings_moderator_id_fkey
  foreign key (moderator_id) references auth.users(id) on delete set null;

alter table public.listings
  drop constraint if exists publication_requires_moderator;
alter table public.listings
  add constraint publication_requires_moderator
  check (status <> 'published' or published_at is not null);

alter table public.moderation_decisions
  alter column reviewer_id drop not null;
alter table public.moderation_decisions
  drop constraint if exists moderation_decisions_reviewer_id_fkey;
alter table public.moderation_decisions
  add constraint moderation_decisions_reviewer_id_fkey
  foreign key (reviewer_id) references auth.users(id) on delete set null;

alter table public.audit_log
  drop constraint if exists audit_log_actor_id_fkey;
alter table public.audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;
