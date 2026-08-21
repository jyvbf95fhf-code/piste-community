begin;

create table if not exists public.operational_calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  call_at timestamptz not null default now(),
  disappearance_at timestamptz,
  status text not null default 'draft' check (status in ('draft','ready','engaged','closed')),
  urgency text check (urgency is null or urgency in ('standard','vulnerable','immediate')),
  caller jsonb not null default '{}'::jsonb,
  subject jsonb not null default '{}'::jsonb,
  circumstances text check (circumstances is null or char_length(circumstances) <= 5000),
  habits text check (habits is null or char_length(habits) <= 5000),
  likely_places text check (likely_places is null or char_length(likely_places) <= 5000),
  environment_types text[] not null default '{}'::text[],
  hazards text[] not null default '{}'::text[],
  terrain_notes text check (terrain_notes is null or char_length(terrain_notes) <= 5000),
  last_known_label text check (last_known_label is null or char_length(last_known_label) <= 500),
  last_known_lat double precision check (last_known_lat is null or last_known_lat between -90 and 90),
  last_known_lon double precision check (last_known_lon is null or last_known_lon between -180 and 180),
  markers jsonb not null default '[]'::jsonb,
  weather jsonb not null default '{}'::jsonb,
  environment_analysis jsonb not null default '{}'::jsonb,
  summary text check (summary is null or char_length(summary) <= 15000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_calls_owner_call_idx
  on public.operational_calls(owner_id, call_at desc);
create index if not exists operational_calls_owner_status_idx
  on public.operational_calls(owner_id, status);

alter table public.operational_calls enable row level security;

drop policy if exists operational_calls_select_own on public.operational_calls;
create policy operational_calls_select_own on public.operational_calls
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists operational_calls_insert_own on public.operational_calls;
create policy operational_calls_insert_own on public.operational_calls
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists operational_calls_update_own on public.operational_calls;
create policy operational_calls_update_own on public.operational_calls
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists operational_calls_delete_own on public.operational_calls;
create policy operational_calls_delete_own on public.operational_calls
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on table public.operational_calls from anon;
grant select, insert, update, delete on table public.operational_calls to authenticated;

alter table public.pistes
  add column if not exists operational_call_id uuid references public.operational_calls(id) on delete set null;
create index if not exists pistes_operational_call_idx
  on public.pistes(operational_call_id)
  where operational_call_id is not null;

commit;
