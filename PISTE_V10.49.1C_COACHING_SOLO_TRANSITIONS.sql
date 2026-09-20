-- V10.49.1C — transitions Solo explicites.
-- Préparé pour revue/application manuelle. NE PAS exécuter depuis l'application.
-- Les sessions multi-rôles conservent leurs contrôles V10.42.3 inchangés.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $preflight$
declare
  _name text;
begin
  foreach _name in array array[
    'public.start_coaching_laying(uuid)',
    'public.mark_coaching_track_ready(uuid)',
    'public.start_driver_run(uuid)',
    'public.finish_driver_run(uuid)',
    'private.can_record_people_point_v10423(uuid,uuid,boolean)',
    'private.can_read_coaching_trace_point_v1042(uuid,uuid)',
    'private.can_read_coaching_marker_v1042(uuid,uuid)',
    'private.can_share_coaching_position_v10423(uuid,uuid)',
    'private.can_annotate_people_v10423(uuid)'
  ] loop
    if to_regprocedure(_name) is null then raise exception 'Prérequis absent : %',_name; end if;
  end loop;
end $preflight$;

create or replace function public.start_coaching_laying(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text; solo_mode boolean:=false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.visibility_version is distinct from 3 then
    r:=private.legacy_start_coaching_laying_v10423(p_session_id);
  else
    select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
    solo_mode := role_name='solo'
      and (select count(*) from public.coaching_members m where m.session_id=r.id and m.invitation_status in ('accepted','active'))=1;
    if role_name is distinct from 'traceur' and not solo_mode then raise exception 'Action réservée au traceur'; end if;
    if r.phase='laying' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
    if r.phase<>'preparation' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
    if not solo_mode and ((select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1) then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
    perform set_config('piste.v1040_transition','on',true);
    update public.coaching_sessions set phase='laying',status='live',laying_started_at=coalesce(laying_started_at,now()) where id=r.id returning * into r;
  end if;
  return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.start_coaching_laying(uuid) from public,anon;
grant execute on function public.start_coaching_laying(uuid) to authenticated;

create or replace function public.mark_coaching_track_ready(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text; solo_mode boolean:=false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if coalesce(r.workflow_version,1)<>2 then raise exception 'Session legacy : workflow V10.42 indisponible'; end if;
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  solo_mode := role_name='solo'
    and (select count(*) from public.coaching_members m where m.session_id=r.id and m.invitation_status in ('accepted','active'))=1;
  if not ((r.owner_id=uid and r.laying_mode='coach') or role_name='traceur' or solo_mode) then raise exception 'Rôle non autorisé pour déclarer la piste prête'; end if;
  if r.status='waiting' and r.phase='waiting_ready' then return r; end if;
  if r.status<>'live' or r.phase<>'laying' then raise exception 'Transition vers piste prête invalide'; end if;
  if not solo_mode and ((select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1) then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='waiting',phase='waiting_ready',track_finished_at=coalesce(track_finished_at,now()) where id=r.id returning * into r;
  return r;
end $$;
revoke all on function public.mark_coaching_track_ready(uuid) from public,anon;
grant execute on function public.mark_coaching_track_ready(uuid) to authenticated;

create or replace function public.start_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text; solo_mode boolean:=false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.visibility_version is distinct from 3 then
    r:=private.legacy_start_driver_run_v10423(p_session_id);
  else
    select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
    solo_mode := role_name='solo'
      and (select count(*) from public.coaching_members m where m.session_id=r.id and m.invitation_status in ('accepted','active'))=1;
    if role_name is distinct from 'driver' and not solo_mode then raise exception 'Action réservée au driver'; end if;
    if r.phase='driver_running' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
    if r.phase<>'waiting_ready' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
    if not solo_mode and ((select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1) then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
    perform set_config('piste.v1040_transition','on',true);
    update public.coaching_sessions set phase='driver_running',status='live',driver_started_at=coalesce(driver_started_at,now()) where id=r.id returning * into r;
  end if;
  return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.start_driver_run(uuid) from public,anon;
grant execute on function public.start_driver_run(uuid) to authenticated;

create or replace function public.finish_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text; solo_mode boolean:=false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.visibility_version is distinct from 3 then
    r:=private.legacy_finish_driver_run_v10423(p_session_id);
  else
    select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
    solo_mode := role_name='solo'
      and (select count(*) from public.coaching_members m where m.session_id=r.id and m.invitation_status in ('accepted','active'))=1;
    if role_name is distinct from 'driver' and not solo_mode then raise exception 'Action réservée au driver'; end if;
    if r.phase='completed' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
    if r.phase<>'driver_running' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
    if not solo_mode and ((select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1) then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
    perform set_config('piste.v1040_transition','on',true);
    update public.coaching_sessions set phase='completed',status='live',driver_finished_at=coalesce(driver_finished_at,now()) where id=r.id returning * into r;
  end if;
  return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.finish_driver_run(uuid) from public,anon;
grant execute on function public.finish_driver_run(uuid) to authenticated;

create or replace function private.can_record_people_point_v10423(p_session_id uuid,p_owner_id uuid,p_trace boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select s.visibility_version is distinct from 3 or
  (m.user_id=(select auth.uid()) and p_owner_id=m.user_id and m.invitation_status in ('accepted','active') and s.status='live' and
   ((p_trace and m.role in ('traceur','solo') and s.phase='laying') or (not p_trace and m.role in ('driver','solo') and s.phase='driver_running')))
 from public.coaching_sessions s left join public.coaching_members m on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false)
$$;
revoke all on function private.can_record_people_point_v10423(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.can_record_people_point_v10423(uuid,uuid,boolean) to authenticated;

create or replace function private.can_read_coaching_trace_point_v1042(p_session_id uuid,p_owner_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r public.coaching_sessions; me public.coaching_members; uid uuid:=(select auth.uid());
begin
  if uid is null then return false; end if;
  select * into r from public.coaching_sessions where id=p_session_id;
  if not found then return false; end if;
  if r.visibility_version is distinct from 3 then return private.legacy_can_read_coaching_trace_point_v1042_v10423(p_session_id,p_owner_id); end if;
  select * into me from public.coaching_members where session_id=p_session_id and user_id=uid;
  if me.user_id is null or me.invitation_status not in ('accepted','active') then return false; end if;
  return private.coaching_truth_v10423(p_session_id)
    or (me.role='solo' and p_owner_id=uid and r.phase in ('laying','waiting_ready','driver_running'));
end $$;
revoke all on function private.can_read_coaching_trace_point_v1042(uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_read_coaching_trace_point_v1042(uuid,uuid) to authenticated;

create or replace function private.can_read_coaching_marker_v1042(p_session_id uuid,p_author_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r public.coaching_sessions; me public.coaching_members; uid uuid:=(select auth.uid());
begin
  if uid is null then return false; end if;
  select * into r from public.coaching_sessions where id=p_session_id;
  if not found then return false; end if;
  if r.visibility_version is distinct from 3 then return private.legacy_can_read_coaching_marker_v1042_v10423(p_session_id,p_author_id); end if;
  select * into me from public.coaching_members where session_id=p_session_id and user_id=uid;
  if me.user_id is null or me.invitation_status not in ('accepted','active') then return false; end if;
  return private.coaching_truth_v10423(p_session_id)
    or (me.role='solo' and p_author_id=uid and r.phase in ('laying','waiting_ready','driver_running'));
end $$;
revoke all on function private.can_read_coaching_marker_v1042(uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_read_coaching_marker_v1042(uuid,uuid) to authenticated;

create or replace function private.can_share_coaching_position_v10423(p_session_id uuid,p_owner_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select p_owner_id=(select auth.uid()) and s.visibility_version=3 and s.status in ('waiting','live') and s.phase<>'completed' and m.role in ('coach','traceur','driver','solo') and m.invitation_status in ('accepted','active')
 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id and m.user_id=p_owner_id where s.id=p_session_id),false)
$$;
revoke all on function private.can_share_coaching_position_v10423(uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_share_coaching_position_v10423(uuid,uuid) to authenticated;

create or replace function private.can_annotate_people_v10423(p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select s.visibility_version is distinct from 3 or (m.role in ('coach','driver','traceur','solo') and m.invitation_status in ('accepted','active')) from public.coaching_sessions s left join public.coaching_members m on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false)
$$;
revoke all on function private.can_annotate_people_v10423(uuid) from public,anon,authenticated;
grant execute on function private.can_annotate_people_v10423(uuid) to authenticated;

commit;
