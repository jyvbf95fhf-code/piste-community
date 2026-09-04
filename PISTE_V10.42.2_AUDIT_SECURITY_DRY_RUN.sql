-- V10.42.2 audit sécurité Coaching — DRY RUN transactionnel, ne rien persister.
-- Corrige la divergence blind_mode/visibility_mode et sépare les contributions au débrief.
begin;

alter table public.coaching_debriefs
  add column if not exists driver_notes text;

alter table public.coaching_debriefs
  drop constraint if exists coaching_debriefs_driver_notes_length;
alter table public.coaching_debriefs
  add constraint coaching_debriefs_driver_notes_length
  check (driver_notes is null or char_length(driver_notes) <= 2500);

create or replace function private.can_read_coaching_live_point_v1042(
  p_session_id uuid,
  p_owner_id uuid
) returns boolean
language plpgsql stable security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  mode_name text;
  phase_name text;
  status_name text;
begin
  if uid is null then return false; end if;
  if uid=p_owner_id then return true; end if;
  select m.role into role_name
  from public.coaching_members m
  where m.session_id=p_session_id and m.user_id=uid
    and m.invitation_status in ('accepted','active');
  if role_name is null then return false; end if;
  select coalesce(s.blind_mode,'normal'),coalesce(s.phase,'preparation'),s.status
    into mode_name,phase_name,status_name
  from public.coaching_sessions s where s.id=p_session_id;
  if status_name='ended' or phase_name='completed' then return true; end if;
  if mode_name='normal' then return true; end if;
  if mode_name='simple_blind' then return role_name='coach'; end if;
  if mode_name='full_blind' then return false; end if;
  return false;
end $$;

create or replace function private.can_read_coaching_trace_point_v1042(
  p_session_id uuid,
  p_owner_id uuid
) returns boolean
language plpgsql stable security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  mode_name text;
  phase_name text;
  status_name text;
begin
  if uid is null then return false; end if;
  if uid=p_owner_id then return true; end if;
  select m.role into role_name
  from public.coaching_members m
  where m.session_id=p_session_id and m.user_id=uid
    and m.invitation_status in ('accepted','active');
  if role_name is null then return false; end if;
  select coalesce(s.blind_mode,'normal'),coalesce(s.phase,'preparation'),s.status
    into mode_name,phase_name,status_name
  from public.coaching_sessions s where s.id=p_session_id;
  if status_name='ended' or phase_name='completed' then return true; end if;
  if mode_name='normal' then return true; end if;
  if mode_name='simple_blind' then return role_name='coach'; end if;
  return false;
end $$;

create or replace function private.can_read_coaching_marker_v1042(
  p_session_id uuid,
  p_author_id uuid
) returns boolean
language plpgsql stable security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  mode_name text;
  phase_name text;
  status_name text;
begin
  if uid is null then return false; end if;
  if uid=p_author_id then return true; end if;
  select m.role into role_name
  from public.coaching_members m
  where m.session_id=p_session_id and m.user_id=uid
    and m.invitation_status in ('accepted','active');
  if role_name is null then return false; end if;
  select coalesce(s.blind_mode,'normal'),coalesce(s.phase,'preparation'),s.status
    into mode_name,phase_name,status_name
  from public.coaching_sessions s where s.id=p_session_id;
  if status_name='ended' or phase_name='completed' then return true; end if;
  if mode_name='normal' then return true; end if;
  if mode_name='simple_blind' then return role_name='coach'; end if;
  return false;
end $$;

revoke all on function private.can_read_coaching_live_point_v1042(uuid,uuid) from public,anon;
revoke all on function private.can_read_coaching_trace_point_v1042(uuid,uuid) from public,anon;
revoke all on function private.can_read_coaching_marker_v1042(uuid,uuid) from public,anon;
grant execute on function private.can_read_coaching_live_point_v1042(uuid,uuid) to authenticated;
grant execute on function private.can_read_coaching_trace_point_v1042(uuid,uuid) to authenticated;
grant execute on function private.can_read_coaching_marker_v1042(uuid,uuid) to authenticated;

drop policy if exists "coaching_points_read" on public.coaching_live_points;
drop policy if exists coaching_v1040_live_select on public.coaching_live_points;
drop policy if exists coaching_v1042_live_select on public.coaching_live_points;
create policy coaching_v1042_live_select on public.coaching_live_points
for select to authenticated
using (private.can_read_coaching_live_point_v1042(session_id,owner_id));

drop policy if exists "coaching_trace_points_read" on public.coaching_trace_points;
drop policy if exists coaching_v1040_trace_select on public.coaching_trace_points;
drop policy if exists coaching_v1042_trace_select on public.coaching_trace_points;
create policy coaching_v1042_trace_select on public.coaching_trace_points
for select to authenticated
using (private.can_read_coaching_trace_point_v1042(session_id,owner_id));

drop policy if exists "coaching_markers_read" on public.coaching_markers;
drop policy if exists coaching_v1042_markers_select on public.coaching_markers;
create policy coaching_v1042_markers_select on public.coaching_markers
for select to authenticated
using (private.can_read_coaching_marker_v1042(session_id,author_id));

create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
    'workflow_version',coalesce(s.workflow_version,1),
    'blind_mode',coalesce(s.blind_mode,'normal'),
    'planned_route',case
      when coalesce(s.workflow_version,1)<2
        or s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and
          (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))
      then coalesce(to_jsonb(s.planned_route),'[]'::jsonb)
      else '[]'::jsonb end,
    'planned_markers',case
      when coalesce(s.workflow_version,1)<2
        or s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and
          (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))
      then coalesce(to_jsonb(s.planned_markers),'[]'::jsonb)
      else '[]'::jsonb end,
    'odor_model',case
      when coalesce(s.workflow_version,1)<2
        or s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and
          (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))
      then coalesce(to_jsonb(s.odor_model),'{}'::jsonb)
      else '{}'::jsonb end,
    'coaching_members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'role',m.role,'user_id',m.user_id,
        'invitation_status',m.invitation_status,'ready_at',m.ready_at))
      from public.coaching_members m where m.session_id=s.id
    ),'[]'::jsonb)
  ) order by s.created_at desc),'[]'::jsonb)
  from public.coaching_sessions s
  join public.coaching_members me
    on me.session_id=s.id and me.user_id=(select auth.uid())
  where (p_session_id is null or s.id=p_session_id)
    and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

create or replace function private.guard_coaching_debrief_contributions_v1042()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  session_phase text;
  session_status text;
begin
  select m.role,s.phase,s.status into role_name,session_phase,session_status
  from public.coaching_members m
  join public.coaching_sessions s on s.id=m.session_id
  where m.session_id=new.session_id and m.user_id=uid
    and m.invitation_status in ('accepted','active');
  if role_name is null then raise exception 'Participation Coaching requise'; end if;
  if session_status<>'ended' and session_phase<>'completed' then
    raise exception 'Débrief disponible après le parcours';
  end if;
  if role_name='driver' then
    if tg_op='INSERT' and
      (new.strengths is not null or new.improvement_area is not null
       or new.coach_notes is not null or new.statistics_notes is not null
       or new.actual_track<>'[]'::jsonb)
    then raise exception 'Le Conducteur ne peut écrire que son retour'; end if;
    if tg_op='UPDATE' and
      (new.strengths is distinct from old.strengths
       or new.improvement_area is distinct from old.improvement_area
       or new.coach_notes is distinct from old.coach_notes
       or new.statistics_notes is distinct from old.statistics_notes
       or new.actual_track is distinct from old.actual_track
       or new.publication_status is distinct from old.publication_status
       or new.published_at is distinct from old.published_at)
    then raise exception 'Analyse du Coach protégée'; end if;
  elsif role_name in ('coach','solo') then
    if tg_op='INSERT' and new.driver_notes is not null
      then raise exception 'Retour du Conducteur protégé'; end if;
    if tg_op='UPDATE' and new.driver_notes is distinct from old.driver_notes
      then raise exception 'Retour du Conducteur protégé'; end if;
  else
    raise exception 'Rôle non autorisé pour le débrief';
  end if;
  return new;
end $$;

drop trigger if exists coaching_debrief_contributions_guard_v1042
  on public.coaching_debriefs;
create trigger coaching_debrief_contributions_guard_v1042
before insert or update on public.coaching_debriefs
for each row execute function private.guard_coaching_debrief_contributions_v1042();

drop policy if exists "coaching_debriefs_read" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_insert" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_update" on public.coaching_debriefs;
create policy coaching_debriefs_read on public.coaching_debriefs
for select to authenticated using (
  exists (
    select 1 from public.coaching_sessions s
    join public.coaching_members m on m.session_id=s.id
    where s.id=coaching_debriefs.session_id
      and m.user_id=(select auth.uid())
      and m.invitation_status in ('accepted','active')
      and (s.status='ended' or s.phase='completed')
  )
);
create policy coaching_debriefs_insert on public.coaching_debriefs
for insert to authenticated with check (
  exists (
    select 1 from public.coaching_sessions s
    join public.coaching_members m on m.session_id=s.id
    where s.id=coaching_debriefs.session_id
      and s.owner_id=coaching_debriefs.owner_id
      and m.user_id=(select auth.uid())
      and m.role in ('coach','driver','solo')
      and m.invitation_status in ('accepted','active')
      and (s.status='ended' or s.phase='completed')
  )
);
create policy coaching_debriefs_update on public.coaching_debriefs
for update to authenticated using (
  exists (
    select 1 from public.coaching_sessions s
    join public.coaching_members m on m.session_id=s.id
    where s.id=coaching_debriefs.session_id
      and m.user_id=(select auth.uid())
      and m.role in ('coach','driver','solo')
      and m.invitation_status in ('accepted','active')
      and (s.status='ended' or s.phase='completed')
  )
) with check (
  exists (
    select 1 from public.coaching_sessions s
    join public.coaching_members m on m.session_id=s.id
    where s.id=coaching_debriefs.session_id
      and s.owner_id=coaching_debriefs.owner_id
      and m.user_id=(select auth.uid())
      and m.role in ('coach','driver','solo')
      and m.invitation_status in ('accepted','active')
      and (s.status='ended' or s.phase='completed')
  )
);


-- Vérifications dans la transaction avant annulation.
select policyname,tablename,cmd
from pg_policies
where schemaname='public'
  and tablename in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs')
order by tablename,policyname;
select routine_schema,routine_name,security_type
from information_schema.routines
where routine_schema in ('private','public')
  and routine_name in (
    'can_read_coaching_live_point_v1042',
    'can_read_coaching_trace_point_v1042',
    'can_read_coaching_marker_v1042',
    'guard_coaching_debrief_contributions_v1042',
    'get_my_coaching_sessions'
  )
order by routine_schema,routine_name;

rollback;

