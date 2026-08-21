begin;

create table if not exists public.dog_health_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  kind text not null check (kind in ('illness','medication','deworming','external_parasite','bravecto','vaccine','vet_visit','other')),
  title text not null check (char_length(title) between 1 and 120),
  details text check (details is null or char_length(details) <= 1000),
  event_on date not null default current_date,
  due_on date,
  interval_months smallint check (interval_months is null or interval_months between 1 and 120),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dog_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  dog_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (dog_id, shared_with),
  check (owner_id <> shared_with)
);

create table if not exists public.dog_duties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  assigned_user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists dog_health_events_owner_due_idx on public.dog_health_events(owner_id, due_on);
create index if not exists dog_health_events_dog_idx on public.dog_health_events(dog_id);
create index if not exists dog_shares_owner_idx on public.dog_shares(owner_id);
create index if not exists dog_shares_recipient_idx on public.dog_shares(shared_with);
create index if not exists dog_shares_dog_idx on public.dog_shares(dog_id);
create index if not exists dog_duties_owner_start_idx on public.dog_duties(owner_id, starts_at);
create index if not exists dog_duties_assigned_start_idx on public.dog_duties(assigned_user_id, starts_at);
create index if not exists dog_duties_dog_idx on public.dog_duties(dog_id);

alter table public.dog_health_events enable row level security;
alter table public.dog_shares enable row level security;
alter table public.dog_duties enable row level security;

drop policy if exists dog_health_select_own on public.dog_health_events;
create policy dog_health_select_own on public.dog_health_events for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists dog_health_insert_own on public.dog_health_events;
create policy dog_health_insert_own on public.dog_health_events for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = (select auth.uid())));
drop policy if exists dog_health_update_own on public.dog_health_events;
create policy dog_health_update_own on public.dog_health_events for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = (select auth.uid())));
drop policy if exists dog_health_delete_own on public.dog_health_events;
create policy dog_health_delete_own on public.dog_health_events for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists dog_shares_select_participant on public.dog_shares;
create policy dog_shares_select_participant on public.dog_shares for select to authenticated using ((select auth.uid()) in (owner_id, shared_with));
drop policy if exists dog_shares_insert_own on public.dog_shares;
create policy dog_shares_insert_own on public.dog_shares for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = (select auth.uid())));
drop policy if exists dog_shares_update_own on public.dog_shares;
create policy dog_shares_update_own on public.dog_shares for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = (select auth.uid())));
drop policy if exists dog_shares_delete_own on public.dog_shares;
create policy dog_shares_delete_own on public.dog_shares for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists dog_duties_select_participant on public.dog_duties;
create policy dog_duties_select_participant on public.dog_duties for select to authenticated using ((select auth.uid()) in (owner_id, assigned_user_id));
drop policy if exists dog_duties_insert_own on public.dog_duties;
create policy dog_duties_insert_own on public.dog_duties for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists dog_duties_update_own on public.dog_duties;
create policy dog_duties_update_own on public.dog_duties for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists dog_duties_delete_own on public.dog_duties;
create policy dog_duties_delete_own on public.dog_duties for delete to authenticated using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.dog_health_events to authenticated;
grant select, insert, update, delete on public.dog_shares to authenticated;
grant select, insert, update, delete on public.dog_duties to authenticated;

commit;
