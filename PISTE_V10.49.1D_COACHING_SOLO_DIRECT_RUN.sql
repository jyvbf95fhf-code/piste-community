-- V10.49.1D — flux Solo direct explicite.
-- Préparé pour revue/application manuelle. NE PAS exécuter depuis l'application.
-- Les sessions classiques conservent les transitions V10.42/V10.49 existantes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $preflight$
declare
  _name text;
begin
  foreach _name in array array[
    'public.coaching_sessions',
    'public.coaching_members',
    'public.start_coaching_laying(uuid)',
    'public.start_driver_run(uuid)',
    'public.finish_coaching_track_v1049(uuid)',
    'private.coaching_v1049_session_guard()'
  ] loop
    if to_regprocedure(_name) is null and to_regclass(_name) is null then
      raise exception 'Prérequis absent : %',_name;
    end if;
  end loop;
end $preflight$;

create or replace function public.start_solo_run(p_session_id uuid)
returns public.coaching_sessions
language plpgsql
security definer set search_path='' as $$
declare
  uid uuid := (select auth.uid());
  r public.coaching_sessions;
  active_count integer;
  started_at timestamptz := statement_timestamp();
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  select count(*) into active_count
  from public.coaching_members m
  where m.session_id=r.id and m.invitation_status in ('accepted','active');
  if active_count<>1 or not exists(
    select 1 from public.coaching_members m
    where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')
  ) then raise exception 'Session Solo valide requise'; end if;
  if r.visibility_version is distinct from 3 then raise exception 'Session Solo V10.49 requise'; end if;
  if r.phase='driver_running' and r.status='live' then return r; end if;
  if r.phase<>'preparation' or r.status not in ('waiting','live') then raise exception 'Départ Solo déjà engagé ou invalide'; end if;
  perform set_config('piste.v1040_transition','on',true);
  perform set_config('piste.v1049_origin_transition','on',true);
  update public.coaching_sessions
  set status='live',
      phase='driver_running',
      driver_started_at=coalesce(driver_started_at,started_at),
      track_started_at=coalesce(track_started_at,started_at),
      track_started_source=coalesce(track_started_source,'live')
  where id=r.id
  returning * into r;
  return r;
end $$;
revoke all on function public.start_solo_run(uuid) from public,anon,authenticated;
grant execute on function public.start_solo_run(uuid) to authenticated;

create or replace function public.finish_solo_run(p_session_id uuid)
returns boolean
language plpgsql
security definer set search_path='' as $$
declare
  uid uuid := (select auth.uid());
  r public.coaching_sessions;
  active_count integer;
  finished boolean;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  select count(*) into active_count
  from public.coaching_members m
  where m.session_id=r.id and m.invitation_status in ('accepted','active');
  if active_count<>1 or not exists(
    select 1 from public.coaching_members m
    where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')
  ) then raise exception 'Session Solo valide requise'; end if;
  if r.status='ended' or r.debrief_status in ('track_finished','in_progress','closed') then return true; end if;
  if r.status<>'live' or r.phase<>'driver_running' then raise exception 'Parcours Solo non actif'; end if;
  select public.finish_coaching_track_v1049(p_session_id) into finished;
  return coalesce(finished,false);
end $$;
revoke all on function public.finish_solo_run(uuid) from public,anon,authenticated;
grant execute on function public.finish_solo_run(uuid) to authenticated;

commit;
