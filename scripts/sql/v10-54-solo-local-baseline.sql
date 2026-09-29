-- Local-only V10.54 integration baseline.
-- This reproduces the V10.42.3/V10.45/V10.53 objects required by the
-- prepared migration. It is never pointed at a remote Supabase project.

create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists private;
do $$ begin
  create role authenticated;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role anon;
exception when duplicate_object then null;
end $$;

create table if not exists auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid
language sql stable security definer set search_path=''
as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;

create table if not exists public.training_routes(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null,
  route jsonb not null default '[]'::jsonb,
  waypoints jsonb not null default '[]'::jsonb,
  odor_model jsonb not null default '{}'::jsonb
);
create table if not exists public.friendships(
  requester uuid not null, addressee uuid not null, status text not null,
  primary key(requester, addressee)
);

create table if not exists public.coaching_sessions(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  route_id uuid references public.training_routes(id),
  name text not null,
  status text not null default 'waiting',
  workflow_version integer not null default 2,
  visibility_version integer,
  blind_mode text not null default 'normal',
  visibility_mode text not null default 'all',
  phase text not null default 'preparation',
  laying_mode text not null default 'traceur',
  traceur_mode text not null default 'connected',
  planned_route jsonb not null default '[]'::jsonb,
  planned_markers jsonb not null default '[]'::jsonb,
  odor_model jsonb not null default '{}'::jsonb,
  departure_point jsonb not null default '{}'::jsonb,
  invite_code text not null unique,
  expires_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  laying_started_at timestamptz,
  track_finished_at timestamptz,
  driver_started_at timestamptz,
  driver_finished_at timestamptz,
  debrief_status text,
  created_at timestamptz not null default now()
);
create table if not exists public.coaching_members(
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  invitation_status text not null default 'accepted',
  joined_at timestamptz not null default now(),
  primary key(session_id,user_id)
);
alter table public.coaching_members drop constraint if exists coaching_members_role_check;
alter table public.coaching_members add constraint coaching_members_role_check
  check(role in ('driver','coach','observer','traceur','solo'));

create table if not exists public.coaching_trace_points(
  id bigint generated always as identity primary key,
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  lat double precision not null, lon double precision not null,
  accuracy_m double precision, recorded_at timestamptz not null default now()
);
create table if not exists public.coaching_live_points(
  id bigint generated always as identity primary key,
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  lat double precision not null, lon double precision not null,
  accuracy_m double precision, recorded_at timestamptz not null default now()
);
create table if not exists private.coaching_deferred_v1045(
  session_id uuid primary key references public.coaching_sessions(id) on delete cascade,
  search_mode text check(search_mode in ('immediate','deferred')),
  traceur_ready_at timestamptz,
  departure_point jsonb not null default '{}'::jsonb
);

create or replace function private.guard_people_session_v10423()
returns trigger language plpgsql security invoker set search_path=''
as $$ begin return new; end $$;
drop trigger if exists coaching_people_guard_v10423 on public.coaching_sessions;
create trigger coaching_people_guard_v10423 before insert or update
on public.coaching_sessions for each row execute function private.guard_people_session_v10423();

create or replace function public.create_coaching_people_session_v1053(uuid,jsonb,text,text)
returns jsonb language sql security definer set search_path=''
as $$ select '{}'::jsonb $$;
create or replace function public.get_my_coaching_sessions(uuid default null)
returns jsonb language sql security definer set search_path=''
as $$ select '[]'::jsonb $$;
create or replace function public.finish_coaching_track_v1049(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
  update public.coaching_sessions
     set status='ended', phase='completed', debrief_status='track_finished',
         ended_at=coalesce(ended_at,statement_timestamp())
   where id=p_session_id;
  return found;
end $$;

create or replace function private.can_record_people_point_v10423(uuid,uuid,boolean)
returns boolean language sql stable security definer set search_path=''
as $$
 select coalesce((select s.visibility_version is distinct from 3 or
  (m.user_id=(select auth.uid()) and p_owner_id=m.user_id
   and m.invitation_status in ('accepted','active') and s.status='live'
   and ((p_trace and m.role in ('traceur','solo') and s.phase='laying')
     or (not p_trace and m.role in ('driver','solo') and s.phase='driver_running')))
  from public.coaching_sessions s
  left join public.coaching_members m
    on m.session_id=s.id and m.user_id=(select auth.uid())
  where s.id=p_session_id),false)
$$;

alter table public.coaching_sessions enable row level security;
alter table public.coaching_members enable row level security;
alter table public.coaching_trace_points enable row level security;
alter table public.coaching_live_points enable row level security;
create policy coaching_trace_insert_local on public.coaching_trace_points
  for insert to authenticated with check(private.can_record_people_point_v10423(session_id,owner_id,true));
create policy coaching_live_insert_local on public.coaching_live_points
  for insert to authenticated with check(private.can_record_people_point_v10423(session_id,owner_id,false));
-- Read policies are intentionally broad only inside this ephemeral test DB so
-- assertions can inspect synthetic rows; production policies are untouched.
create policy coaching_sessions_read_local on public.coaching_sessions
  for select to authenticated using(true);
create policy coaching_members_read_local on public.coaching_members
  for select to authenticated using(true);
create policy coaching_trace_read_local on public.coaching_trace_points
  for select to authenticated using(true);
create policy coaching_live_read_local on public.coaching_live_points
  for select to authenticated using(true);
grant usage on schema public,private,auth to authenticated;
grant select,insert,update on public.coaching_sessions,public.coaching_members,
  public.coaching_trace_points,public.coaching_live_points to authenticated;
grant usage,select on all sequences in schema public to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function public.create_coaching_people_session_v1053(uuid,jsonb,text,text) to authenticated;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;
grant execute on function public.finish_coaching_track_v1049(uuid) to authenticated;

-- The V10.54 RPC resolves a route only when supplied; tests use NULL routes.
