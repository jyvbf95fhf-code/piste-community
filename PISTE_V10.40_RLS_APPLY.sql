-- V10.40 RLS APPLY — proposition à exécuter manuellement après revue.
-- Ne pas exécuter automatiquement. Aucun service Edge/Push n'est créé ici.
begin;

alter table if exists public.coaching_sessions add column if not exists phase text not null default 'preparation';
alter table if exists public.coaching_sessions add column if not exists laying_mode text default 'coach';
alter table if exists public.coaching_sessions add column if not exists laying_started_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists track_finished_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists coach_ready_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists driver_started_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists driver_finished_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists ended_at timestamptz;
alter table if exists public.coaching_sessions add column if not exists scenario_title text;
alter table if exists public.coaching_sessions add column if not exists scenario_text text;
alter table if exists public.coaching_sessions add column if not exists scenario_photo_url text;
alter table if exists public.coaching_sessions add column if not exists scenario_acknowledged_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='coaching_sessions_phase_v1040') then
    alter table public.coaching_sessions add constraint coaching_sessions_phase_v1040 check (phase in ('preparation','laying','laid','waiting_ready','coach_ready','driver_running','completed')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='coaching_sessions_laying_mode_v1040') then
    alter table public.coaching_sessions add constraint coaching_sessions_laying_mode_v1040 check (laying_mode in ('coach','traceur')) not valid;
  end if;
end $$;

-- Les colonnes de phase/timestamps ne sont plus modifiables par UPDATE direct.
-- Seules les RPC ci-dessus, authentifiées et contrôlées, les écrivent.
revoke update (phase,laying_mode,laying_started_at,track_finished_at,coach_ready_at,driver_started_at,driver_finished_at,ended_at) on public.coaching_sessions from authenticated, anon;

-- RPC de transitions : SECURITY INVOKER, search_path explicite, auth.uid obligatoire.
create or replace function public.start_coaching_laying(p_session_id uuid)
returns public.coaching_sessions
language plpgsql security definer set search_path = ''
as $$ declare r public.coaching_sessions; role_name text; begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  select cm.role into role_name from public.coaching_members cm where cm.session_id=r.id and cm.user_id=(select auth.uid()) and cm.invitation_status in ('accepted','active');
  if not (r.owner_id=(select auth.uid()) and r.laying_mode='coach') and role_name<>'traceur' then raise exception 'Rôle non autorisé pour la pose'; end if;
  if r.status<>'live' or coalesce(r.phase,'preparation')<>'preparation' then raise exception 'Transition preparation -> laying invalide'; end if;
  perform set_config('piste.v1040_transition','on',true); update public.coaching_sessions set phase='laying', laying_started_at=coalesce(laying_started_at,now()) where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.finish_coaching_laying(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path = ''
as $$ declare r public.coaching_sessions; role_name text; begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  select cm.role into role_name from public.coaching_members cm where cm.session_id=r.id and cm.user_id=(select auth.uid()) and cm.invitation_status in ('accepted','active');
  if not (r.owner_id=(select auth.uid()) and r.laying_mode='coach') and role_name<>'traceur' then raise exception 'Rôle non autorisé pour la fin de pose'; end if;
  if r.status<>'live' or r.phase<>'laying' then raise exception 'Transition laying -> laid invalide'; end if;
  perform set_config('piste.v1040_transition','on',true); update public.coaching_sessions set phase='laid', track_finished_at=coalesce(track_finished_at,now()) where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.set_coaching_ready(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path = ''
as $$ declare r public.coaching_sessions; begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.owner_id<>(select auth.uid()) then raise exception 'Seul le créateur peut se déclarer en place'; end if;
  if r.status<>'live' or r.phase not in ('laid','waiting_ready') then raise exception 'Session non prête pour coach_ready'; end if;
  perform set_config('piste.v1040_transition','on',true); update public.coaching_sessions set phase='coach_ready', coach_ready_at=coalesce(coach_ready_at,now()) where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.start_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path = ''
as $$ declare r public.coaching_sessions; role_name text; begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  select cm.role into role_name from public.coaching_members cm where cm.session_id=r.id and cm.user_id=(select auth.uid()) and cm.invitation_status in ('accepted','active');
  if role_name<>'driver' then raise exception 'Seul le Conducteur peut démarrer son parcours'; end if;
  if r.status<>'live' or r.phase<>'coach_ready' then raise exception 'Transition coach_ready -> driver_running invalide'; end if;
  perform set_config('piste.v1040_transition','on',true); update public.coaching_sessions set phase='driver_running', driver_started_at=coalesce(driver_started_at,now()) where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.finish_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path = ''
as $$ declare r public.coaching_sessions; role_name text; begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  select cm.role into role_name from public.coaching_members cm where cm.session_id=r.id and cm.user_id=(select auth.uid()) and cm.invitation_status in ('accepted','active');
  if role_name<>'driver' then raise exception 'Seul le Conducteur peut terminer son parcours'; end if;
  if r.status<>'live' or r.phase<>'driver_running' then raise exception 'Transition driver_running -> completed invalide'; end if;
  perform set_config('piste.v1040_transition','on',true); update public.coaching_sessions set phase='completed', driver_finished_at=coalesce(driver_finished_at,now()) where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.finish_coaching_session(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path = ''
as $$ declare r public.coaching_sessions; begin
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.owner_id<>(select auth.uid()) then raise exception 'Seul le créateur peut clôturer la session'; end if;
  if r.status<>'live' or r.phase not in ('completed','driver_running','coach_ready') then raise exception 'Session non clôturable dans cette phase'; end if;
  perform set_config('piste.v1040_transition','on',true); update public.coaching_sessions set status='ended', phase='completed', ended_at=coalesce(ended_at,now()) where id=r.id returning * into r;
  return r;
end $$;

revoke execute on function public.start_coaching_laying(uuid) from public, anon;
revoke execute on function public.finish_coaching_laying(uuid) from public, anon;
revoke execute on function public.set_coaching_ready(uuid) from public, anon;
revoke execute on function public.start_driver_run(uuid) from public, anon;
revoke execute on function public.finish_driver_run(uuid) from public, anon;
revoke execute on function public.finish_coaching_session(uuid) from public, anon;
grant execute on function public.start_coaching_laying(uuid) to authenticated;
grant execute on function public.finish_coaching_laying(uuid) to authenticated;
grant execute on function public.set_coaching_ready(uuid) to authenticated;
grant execute on function public.start_driver_run(uuid) to authenticated;
grant execute on function public.finish_driver_run(uuid) to authenticated;
grant execute on function public.finish_coaching_session(uuid) to authenticated;

-- Remplacement des policies historiques permissives connues.
drop policy if exists "coaching_points_read" on public.coaching_live_points;
drop policy if exists "coaching_trace_points_read" on public.coaching_trace_points;
drop policy if exists "coaching_points_driver_insert" on public.coaching_live_points;
drop policy if exists "coaching_points_team_insert" on public.coaching_live_points;
drop policy if exists "coaching_trace_points_insert" on public.coaching_trace_points;
-- Policies ciblées. Toute policy permissive inconnue doit être retirée après audit.
drop policy if exists coaching_v1040_trace_insert on public.coaching_trace_points;
create policy coaching_v1040_trace_insert on public.coaching_trace_points for insert to authenticated
with check (owner_id=(select auth.uid()) and exists (select 1 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id where s.id=coaching_trace_points.session_id and s.status='live' and s.phase='laying' and m.user_id=(select auth.uid()) and (m.role='traceur' or (m.role='coach' and s.laying_mode='coach')) and m.invitation_status in ('accepted','active')));
drop policy if exists coaching_v1040_trace_select on public.coaching_trace_points;
create policy coaching_v1040_trace_select on public.coaching_trace_points for select to authenticated
using (exists (select 1 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id where s.id=coaching_trace_points.session_id and m.user_id=(select auth.uid()) and m.invitation_status in ('accepted','active') and (m.role='traceur' or (s.visibility_mode in ('all','progressive','simple_blind') and m.role='coach'))));

drop policy if exists coaching_v1040_live_insert on public.coaching_live_points;
create policy coaching_v1040_live_insert on public.coaching_live_points for insert to authenticated
with check (owner_id=(select auth.uid()) and exists (select 1 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id where s.id=coaching_live_points.session_id and s.status='live' and s.phase='driver_running' and m.user_id=(select auth.uid()) and m.role in ('driver','solo') and m.invitation_status in ('accepted','active')));
drop policy if exists coaching_v1040_live_select on public.coaching_live_points;
create policy coaching_v1040_live_select on public.coaching_live_points for select to authenticated
using (exists (select 1 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id where s.id=coaching_live_points.session_id and m.user_id=(select auth.uid()) and m.invitation_status in ('accepted','active') and (coaching_live_points.owner_id=(select auth.uid()) or m.role='traceur' or (s.visibility_mode='all' and m.role in ('coach','observer')) or (s.visibility_mode in ('progressive','simple_blind') and m.role='coach'))));

drop policy if exists coaching_v1040_messages_select on public.coaching_messages;
create policy coaching_v1040_messages_select on public.coaching_messages for select to authenticated
using (exists (select 1 from public.coaching_members m where m.session_id=coaching_messages.session_id and m.user_id=(select auth.uid()) and m.invitation_status in ('accepted','active')));
drop policy if exists coaching_v1040_messages_insert on public.coaching_messages;
create policy coaching_v1040_messages_insert on public.coaching_messages for insert to authenticated
with check (author_id=(select auth.uid()) and exists (select 1 from public.coaching_members m where m.session_id=coaching_messages.session_id and m.user_id=(select auth.uid()) and m.invitation_status in ('accepted','active')));

-- Fonctions séparées : LIVE et TRACE ne partagent plus la même décision.
create or replace function private.can_read_coaching_live_point_v1040(p_session_id uuid,p_owner_id uuid)
returns boolean language plpgsql stable security definer set search_path=''
as $$ declare uid uuid := (select auth.uid()); role_name text; visibility text; phase_name text; status_name text; begin
  if uid is null then return false; end if;
  if uid=p_owner_id then return true; end if;
  select m.role into role_name from public.coaching_members m where m.session_id=p_session_id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name is null then return false; end if;
  select s.visibility_mode,coalesce(s.phase,'preparation'),s.status into visibility,phase_name,status_name from public.coaching_sessions s where s.id=p_session_id;
  if status_name in ('ended','cancelled') or phase_name='completed' then return true; end if;
  if role_name='traceur' then return true; end if;
  if visibility='all' and role_name in ('coach','observer','solo') then return true; end if;
  if visibility in ('progressive','simple_blind') and role_name='coach' then return true; end if;
  return false;
end $$;

create or replace function private.can_read_coaching_trace_point_v1040(p_session_id uuid,p_owner_id uuid)
returns boolean language plpgsql stable security definer set search_path=''
as $$ declare uid uuid := (select auth.uid()); role_name text; visibility text; phase_name text; status_name text; laying text; begin
  if uid is null then return false; end if;
  select s.visibility_mode,coalesce(s.phase,'preparation'),s.status,s.laying_mode into visibility,phase_name,status_name,laying from public.coaching_sessions s where s.id=p_session_id;
  select m.role into role_name from public.coaching_members m where m.session_id=p_session_id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name is null then return false; end if;
  if status_name in ('ended','cancelled') or phase_name='completed' then return true; end if;
  if role_name='traceur' or (role_name='coach' and laying='coach') then return true; end if;
  if visibility in ('all','progressive','simple_blind') and role_name='coach' then return true; end if;
  return false;
end $$;
revoke all on function private.can_read_coaching_live_point_v1040(uuid,uuid) from public,anon;
revoke all on function private.can_read_coaching_trace_point_v1040(uuid,uuid) from public,anon;
grant execute on function private.can_read_coaching_live_point_v1040(uuid,uuid) to authenticated;
grant execute on function private.can_read_coaching_trace_point_v1040(uuid,uuid) to authenticated;

-- Remplacement du RPC historique : les colonnes révélatrices sont masquées
-- pendant le passage en double aveugle pour Conducteur, Coach et Observateur.
create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
    'planned_route',case when s.status in ('ended','cancelled') or coalesce(s.phase,'preparation')='completed' or s.visibility_mode='all' or (s.visibility_mode in ('progressive','simple_blind') and me.role in ('coach','traceur','observer','solo')) or (s.visibility_mode in ('coach','full_blind') and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach'))) then coalesce(to_jsonb(s.planned_route),'[]'::jsonb) else '[]'::jsonb end,
    'planned_markers',case when s.status in ('ended','cancelled') or coalesce(s.phase,'preparation')='completed' or s.visibility_mode='all' or (s.visibility_mode in ('progressive','simple_blind') and me.role in ('coach','traceur','observer','solo')) or (s.visibility_mode in ('coach','full_blind') and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach'))) then coalesce(to_jsonb(s.planned_markers),'[]'::jsonb) else '[]'::jsonb end,
    'odor_model',case when s.status in ('ended','cancelled') or coalesce(s.phase,'preparation')='completed' or s.visibility_mode='all' or (s.visibility_mode in ('progressive','simple_blind') and me.role in ('coach','traceur','observer','solo')) or (s.visibility_mode in ('coach','full_blind') and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach'))) then coalesce(to_jsonb(s.odor_model),'{}'::jsonb) else '{}'::jsonb end,
    'coaching_members',coalesce((select jsonb_agg(jsonb_build_object('role',m.role,'user_id',m.user_id,'invitation_status',m.invitation_status,'ready_at',m.ready_at)) from public.coaching_members m where m.session_id=s.id),'[]'::jsonb)
  ) order by s.created_at desc),'[]'::jsonb)
  from public.coaching_sessions s join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
  where (p_session_id is null or s.id=p_session_id) and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

-- Les membres ne peuvent modifier que leur invitation et ready_at, jamais leur identité/rôle.
create or replace function private.guard_coaching_member_identity()
returns trigger language plpgsql security invoker set search_path=''
as $$ begin
  if new.user_id<>old.user_id or new.session_id<>old.session_id or new.role<>old.role then raise exception 'Identité et rôle du membre immuables'; end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname='coaching_members_identity_guard_v1040') then
    create trigger coaching_members_identity_guard_v1040 before update on public.coaching_members for each row execute function private.guard_coaching_member_identity();
  end if;
end $$;

drop policy if exists coaching_v1040_trace_select on public.coaching_trace_points;
create policy coaching_v1040_trace_select on public.coaching_trace_points for select to authenticated using (private.can_read_coaching_trace_point_v1040(coaching_trace_points.session_id,coaching_trace_points.owner_id));
drop policy if exists coaching_v1040_live_select on public.coaching_live_points;
create policy coaching_v1040_live_select on public.coaching_live_points for select to authenticated using (private.can_read_coaching_live_point_v1040(coaching_live_points.session_id,coaching_live_points.owner_id));

commit;

select table_schema, table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public' and table_name='coaching_sessions'
and column_name in ('phase','laying_mode','laying_started_at','track_finished_at','coach_ready_at','driver_started_at','driver_finished_at','ended_at','scenario_title','scenario_text','scenario_photo_url','scenario_acknowledged_at') order by ordinal_position;
select routine_schema,routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in ('start_coaching_laying','finish_coaching_laying','set_coaching_ready','start_driver_run','finish_driver_run','finish_coaching_session');
select schemaname,tablename,policyname,cmd,roles from pg_policies where schemaname='public' and tablename in ('coaching_sessions','coaching_members','coaching_trace_points','coaching_live_points','coaching_messages');
