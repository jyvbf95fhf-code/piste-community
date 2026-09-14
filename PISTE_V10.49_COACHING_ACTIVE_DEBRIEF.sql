-- V10.49 backend preparation. REVIEW ONLY: do not run without explicit approval.
-- Idempotent DDL/RPC contract for shared pause, final debrief observations,
-- origin timestamps and post-self-leave read access.

alter table public.coaching_sessions
  add column if not exists pause_state text not null default 'running',
  add column if not exists pause_started_at timestamptz,
  add column if not exists pause_started_by uuid references auth.users(id),
  add column if not exists pause_total_ms bigint not null default 0,
  add column if not exists debrief_status text not null default 'none',
  add column if not exists track_started_at timestamptz,
  add column if not exists track_started_source text;

alter table public.training_routes
  add column if not exists track_started_at timestamptz,
  add column if not exists track_started_source text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='coaching_sessions_pause_state_v1049') then
    alter table public.coaching_sessions add constraint coaching_sessions_pause_state_v1049
      check (pause_state in ('running','paused'));
  end if;
  if not exists (select 1 from pg_constraint where conname='coaching_sessions_debrief_status_v1049') then
    alter table public.coaching_sessions add constraint coaching_sessions_debrief_status_v1049
      check (debrief_status in ('none','track_finished','in_progress','closed'));
  end if;
  if not exists (select 1 from pg_constraint where conname='coaching_sessions_track_source_v1049') then
    alter table public.coaching_sessions add constraint coaching_sessions_track_source_v1049
      check (track_started_source is null or track_started_source in ('live','saved','gpx_embedded_time','gpx_manual_time'));
  end if;
  if not exists (select 1 from pg_constraint where conname='training_routes_track_source_v1049') then
    alter table public.training_routes add constraint training_routes_track_source_v1049
      check (track_started_source is null or track_started_source in ('live','saved','gpx_embedded_time','gpx_manual_time'));
  end if;
end $$;

create table if not exists public.coaching_pause_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_by uuid references auth.users(id),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists coaching_pause_one_open_v1049
  on public.coaching_pause_events(session_id) where ended_at is null;
create index if not exists coaching_pause_events_session_time_v1049
  on public.coaching_pause_events(session_id, started_at);

create table if not exists public.coaching_participation_ledger (
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null,
  left_at timestamptz,
  participated_at timestamptz,
  primary key (session_id,user_id)
);
create index if not exists coaching_participation_ledger_user_v1049
  on public.coaching_participation_ledger(user_id,session_id);

create table if not exists public.coaching_debrief_observations (
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  primary key (session_id,user_id),
  check (char_length(body) <= 2500)
);
create index if not exists coaching_debrief_observations_session_v1049
  on public.coaching_debrief_observations(session_id,updated_at);

create or replace function private.coaching_v1049_is_final_reader(p_session_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.coaching_sessions s
    where s.id=p_session_id and s.debrief_status in ('in_progress','closed')
      and (exists (select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=p_user_id and m.invitation_status in ('accepted','active'))
        or exists (select 1 from public.coaching_participation_ledger l where l.session_id=s.id and l.user_id=p_user_id and l.participated_at is not null))
  )
$$;

create or replace function private.coaching_v1049_observation_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); member_role text;
begin
  if uid is null or new.user_id is distinct from uid then raise exception 'Observation personnelle requise'; end if;
  if not private.coaching_v1049_is_final_reader(new.session_id,uid) then raise exception 'Débrief indisponible'; end if;
  select m.role into member_role from public.coaching_members m where m.session_id=new.session_id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if member_role is null then select l.role into member_role from public.coaching_participation_ledger l where l.session_id=new.session_id and l.user_id=uid and l.participated_at is not null; end if;
  if member_role is null then raise exception 'Participation prouvée requise'; end if;
  if tg_op='UPDATE' and (new.session_id is distinct from old.session_id or new.user_id is distinct from old.user_id or new.role is distinct from old.role or new.created_at is distinct from old.created_at or new.revision<>old.revision+1) then raise exception 'Métadonnées de l observation immuables'; end if;
  new.role:=coalesce(old.role,member_role); new.updated_at:=statement_timestamp();
  if tg_op='INSERT' then new.created_at:=statement_timestamp(); new.revision:=1; end if;
  return new;
end $$;
drop trigger if exists coaching_debrief_observation_guard_v1049 on public.coaching_debrief_observations;
create trigger coaching_debrief_observation_guard_v1049 before insert or update on public.coaching_debrief_observations
for each row execute function private.coaching_v1049_observation_guard();

alter table public.coaching_pause_events enable row level security;
alter table public.coaching_participation_ledger enable row level security;
alter table public.coaching_debrief_observations enable row level security;
drop policy if exists coaching_pause_events_read_v1049 on public.coaching_pause_events;
create policy coaching_pause_events_read_v1049 on public.coaching_pause_events for select to authenticated
using (private.is_coaching_member(session_id));
drop policy if exists coaching_participation_ledger_read_v1049 on public.coaching_participation_ledger;
create policy coaching_participation_ledger_read_v1049 on public.coaching_participation_ledger for select to authenticated
using (user_id=(select auth.uid()) or private.coaching_v1049_is_final_reader(session_id,(select auth.uid())));
drop policy if exists coaching_debrief_observations_read_v1049 on public.coaching_debrief_observations;
create policy coaching_debrief_observations_read_v1049 on public.coaching_debrief_observations for select to authenticated
using (private.coaching_v1049_is_final_reader(session_id,(select auth.uid())));
drop policy if exists coaching_debrief_observations_insert_v1049 on public.coaching_debrief_observations;
create policy coaching_debrief_observations_insert_v1049 on public.coaching_debrief_observations for insert to authenticated
with check (user_id=(select auth.uid()) and private.coaching_v1049_is_final_reader(session_id,(select auth.uid())));
drop policy if exists coaching_debrief_observations_update_v1049 on public.coaching_debrief_observations;
create policy coaching_debrief_observations_update_v1049 on public.coaching_debrief_observations for update to authenticated
using (user_id=(select auth.uid()) and private.coaching_v1049_is_final_reader(session_id,(select auth.uid())))
with check (user_id=(select auth.uid()) and private.coaching_v1049_is_final_reader(session_id,(select auth.uid())));
grant select on public.coaching_pause_events,public.coaching_participation_ledger,public.coaching_debrief_observations to authenticated;
grant insert,update on public.coaching_debrief_observations to authenticated;

create or replace function private.coaching_v1049_is_pause_actor(p_session_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.coaching_members m where m.session_id=p_session_id and m.user_id=p_user_id and m.role in ('driver','coach','solo') and m.invitation_status in ('accepted','active'))
$$;
create or replace function public.set_coaching_pause(p_session_id uuid,p_paused boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); r public.coaching_sessions; e public.coaching_pause_events; now_at timestamptz:=statement_timestamp(); total bigint;
begin
  if uid is null or not private.coaching_v1049_is_pause_actor(p_session_id,uid) then raise exception 'Conducteur ou Coach requis'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null or r.status<>'live' then raise exception 'Session non active'; end if;
  if p_paused then
    if r.pause_state='paused' then return jsonb_build_object('paused',true,'changed_at',r.pause_started_at); end if;
    insert into public.coaching_pause_events(session_id,started_by,started_at) values(p_session_id,uid,now_at) returning * into e;
    perform set_config('piste.v1049_pause_transition','on',true);
    update public.coaching_sessions set pause_state='paused',pause_started_at=now_at,pause_started_by=uid where id=p_session_id;
  else
    if r.pause_state='running' then return jsonb_build_object('paused',false,'changed_at',now_at,'pause_total_ms',r.pause_total_ms); end if;
    select * into e from public.coaching_pause_events where session_id=p_session_id and ended_at is null for update;
    update public.coaching_pause_events set ended_by=uid,ended_at=now_at where id=e.id;
    total:=r.pause_total_ms+greatest(0,extract(epoch from (now_at-e.started_at))*1000)::bigint;
    perform set_config('piste.v1049_pause_transition','on',true);
    update public.coaching_sessions set pause_state='running',pause_started_at=null,pause_started_by=null,pause_total_ms=total where id=p_session_id;
  end if;
  return jsonb_build_object('paused',p_paused,'changed_at',now_at,'pause_total_ms',coalesce(total,r.pause_total_ms));
end $$;
revoke all on function public.set_coaching_pause(uuid,boolean) from public,anon;
grant execute on function public.set_coaching_pause(uuid,boolean) to authenticated;

create or replace function public.finish_coaching_track_v1049(p_session_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); r public.coaching_sessions; finished_at timestamptz:=statement_timestamp();
begin
  if uid is null or not exists(select 1 from public.coaching_members m where m.session_id=p_session_id and m.user_id=uid and m.role in ('driver','solo') and m.invitation_status in ('accepted','active')) then raise exception 'Conducteur actif requis'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.debrief_status in ('track_finished','in_progress','closed') or r.status='ended' then return true; end if;
  if r.status<>'live' then raise exception 'Session non active'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='ended',phase='completed',ended_at=coalesce(ended_at,finished_at),driver_finished_at=coalesce(driver_finished_at,finished_at),track_finished_at=coalesce(track_finished_at,finished_at),debrief_status='in_progress',pause_state='running' where id=p_session_id;
  return true;
end $$;
revoke all on function public.finish_coaching_track_v1049(uuid) from public,anon;
grant execute on function public.finish_coaching_track_v1049(uuid) to authenticated;

create or replace function public.close_coaching_debrief_v1049(p_session_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); r public.coaching_sessions;
begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if not exists(select 1 from public.coaching_members m where m.session_id=p_session_id and m.user_id=uid and m.role in ('driver','coach','solo') and m.invitation_status in ('accepted','active')) then raise exception 'Conducteur ou Coach requis'; end if;
  if r.debrief_status='closed' then return true; end if;
  if r.debrief_status<>'in_progress' then raise exception 'Débrief non disponible'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set debrief_status='closed' where id=p_session_id;
  return true;
end $$;
revoke all on function public.close_coaching_debrief_v1049(uuid) from public,anon;
grant execute on function public.close_coaching_debrief_v1049(uuid) to authenticated;

create or replace function private.coaching_v1049_capture_participation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.coaching_participation_ledger(session_id,user_id,role,joined_at,participated_at)
  select new.session_id,new.owner_id,m.role,m.joined_at,new.recorded_at from public.coaching_members m
  where m.session_id=new.session_id and m.user_id=new.owner_id
  on conflict(session_id,user_id) do update set participated_at=least(coalesce(public.coaching_participation_ledger.participated_at,excluded.participated_at),excluded.participated_at);
  return new;
end $$;
drop trigger if exists coaching_capture_participation_live_v1049 on public.coaching_live_points;
create trigger coaching_capture_participation_live_v1049 after insert on public.coaching_live_points for each row execute function private.coaching_v1049_capture_participation();
drop trigger if exists coaching_capture_participation_trace_v1049 on public.coaching_trace_points;
create trigger coaching_capture_participation_trace_v1049 after insert on public.coaching_trace_points for each row execute function private.coaching_v1049_capture_participation();

create or replace function private.coaching_v1049_archive_member()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.coaching_participation_ledger(session_id,user_id,role,joined_at,left_at,participated_at)
  select old.session_id,old.user_id,old.role,old.joined_at,statement_timestamp(),min(recorded_at)
  from (
    select recorded_at from public.coaching_live_points where session_id=old.session_id and owner_id=old.user_id
    union all
    select recorded_at from public.coaching_trace_points where session_id=old.session_id and owner_id=old.user_id
  ) points
  on conflict(session_id,user_id) do update set left_at=excluded.left_at,participated_at=coalesce(public.coaching_participation_ledger.participated_at,excluded.participated_at);
  return old;
end $$;
drop trigger if exists coaching_archive_member_v1049 on public.coaching_members;
create trigger coaching_archive_member_v1049 after delete on public.coaching_members for each row execute function private.coaching_v1049_archive_member();

create or replace function private.coaching_v1049_capture_track_origin()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.track_started_at is null and new.route_id is not null then
    select r.track_started_at,r.track_started_source into new.track_started_at,new.track_started_source from public.training_routes r where r.id=new.route_id;
  end if;
  return new;
end $$;
drop trigger if exists coaching_capture_track_origin_v1049 on public.coaching_sessions;
create trigger coaching_capture_track_origin_v1049 before insert on public.coaching_sessions for each row execute function private.coaching_v1049_capture_track_origin();

create or replace function private.coaching_v1049_capture_first_trace_time()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.coaching_sessions set track_started_at=coalesce(track_started_at,new.recorded_at),track_started_source=coalesce(track_started_source,'live') where id=new.session_id and track_started_at is null;
  return new;
end $$;
drop trigger if exists coaching_capture_first_trace_time_v1049 on public.coaching_trace_points;
create trigger coaching_capture_first_trace_time_v1049 after insert on public.coaching_trace_points for each row execute function private.coaching_v1049_capture_first_trace_time();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='coaching_pause_events') then alter publication supabase_realtime add table public.coaching_pause_events; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='coaching_debrief_observations') then alter publication supabase_realtime add table public.coaching_debrief_observations; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='coaching_participation_ledger') then alter publication supabase_realtime add table public.coaching_participation_ledger; end if;
end $$;
