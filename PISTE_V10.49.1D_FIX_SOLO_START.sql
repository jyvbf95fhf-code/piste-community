-- V10.49.1D corrective patch — qualify Solo start timestamps.
-- Prepared for manual Supabase review. Do not execute from the application.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $preflight$
begin
  if to_regprocedure('public.start_solo_run(uuid)') is null then
    raise exception 'Prérequis absent : public.start_solo_run(uuid)';
  end if;
end $preflight$;

create or replace function public.start_solo_run(p_session_id uuid)
returns public.coaching_sessions
language plpgsql
security definer set search_path='' as $$
declare
  uid uuid := (select auth.uid());
  r public.coaching_sessions;
  active_count integer;
  v_started_at timestamptz := statement_timestamp();
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions as cs where cs.id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  select count(*) into active_count
  from public.coaching_members as m
  where m.session_id=r.id and m.invitation_status in ('accepted','active');
  if active_count<>1 or not exists(
    select 1 from public.coaching_members as m
    where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')
  ) then raise exception 'Session Solo valide requise'; end if;
  if r.visibility_version is distinct from 3 then raise exception 'Session Solo V10.49 requise'; end if;
  if r.phase='driver_running' and r.status='live' then return r; end if;
  if r.phase<>'preparation' or r.status not in ('waiting','live') then raise exception 'Départ Solo déjà engagé ou invalide'; end if;
  perform set_config('piste.v1040_transition','on',true);
  perform set_config('piste.v1049_origin_transition','on',true);
  update public.coaching_sessions as cs
  set status='live',
      phase='driver_running',
      driver_started_at=coalesce(cs.driver_started_at,v_started_at),
      track_started_at=coalesce(cs.track_started_at,v_started_at),
      track_started_source=coalesce(cs.track_started_source,'live')
  where cs.id=r.id
  returning cs.* into r;
  return r;
end $$;

revoke all on function public.start_solo_run(uuid) from public,anon,authenticated;
grant execute on function public.start_solo_run(uuid) to authenticated;

commit;
