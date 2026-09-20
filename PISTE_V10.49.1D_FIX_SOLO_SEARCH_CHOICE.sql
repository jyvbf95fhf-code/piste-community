-- V10.49.1D corrective patch — Solo does not require the classic Traceur search choice.
-- Prepared for manual Supabase review. Do not execute from the application.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $preflight$
begin
  if to_regprocedure('private.guard_coaching_deferred_transition_v1045()') is null then
    raise exception 'Prérequis absent : private.guard_coaching_deferred_transition_v1045()';
  end if;
  if to_regclass('public.coaching_sessions') is null or to_regclass('public.coaching_members') is null then
    raise exception 'Prérequis absent : tables Coaching';
  end if;
end $preflight$;

create or replace function private.guard_coaching_deferred_transition_v1045()
returns trigger
language plpgsql
security definer set search_path=''
as $$
declare
  d private.coaching_deferred_v1045;
  solo_mode boolean := false;
begin
  select * into d
  from private.coaching_deferred_v1045
  where session_id=old.id;
  if d.session_id is null then return new; end if;

  select count(*)=1 and count(*) filter (where m.role='solo')=1
    into solo_mode
  from public.coaching_members as m
  where m.session_id=old.id
    and m.invitation_status in ('accepted','active');

  if old.laying_started_at is null and new.phase='laying' and old.phase<>'laying' then
    new.laying_started_at:=clock_timestamp();
  end if;
  if old.track_finished_at is null and new.phase='waiting_ready' and old.phase='laying' then
    new.track_finished_at:=clock_timestamp();
  end if;
  if old.driver_started_at is null and new.phase='driver_running' and old.phase<>'driver_running' then
    new.driver_started_at:=clock_timestamp();
  end if;
  if old.driver_finished_at is null and new.phase='completed' and old.phase='driver_running' then
    new.driver_finished_at:=clock_timestamp();
  end if;
  if old.ended_at is null and new.status='ended' and old.status<>'ended' then
    new.ended_at:=clock_timestamp();
  end if;
  if old.phase='laying' and new.phase='waiting_ready' and jsonb_array_length(old.planned_route)=0 then
    if (select count(*) from (
      select 1
      from public.coaching_trace_points as p
      join public.coaching_members as m
        on m.session_id=p.session_id and m.user_id=p.owner_id and m.role='traceur'
      where p.session_id=old.id
      limit 2
    ) as points)<2 then
      raise exception 'Enregistrez au moins deux points réels avant Piste tracée';
    end if;
  end if;

  -- Classic sessions still require the Traceur search choice. An explicit,
  -- single-member Solo session is exempt from that inherited validation only.
  if old.phase is distinct from new.phase
     and new.phase='driver_running'
     and d.search_mode is null
     and not solo_mode then
    raise exception 'Attendez le choix de recherche du Traceur';
  end if;
  if old.phase is distinct from new.phase and new.phase='driver_running' and d.search_mode='deferred' then
    if d.traceur_ready_at is null or old.track_finished_at is null then
      raise exception 'Attendez la confirmation Traceur en place';
    end if;
  end if;
  return new;
end $$;

revoke all on function private.guard_coaching_deferred_transition_v1045() from public,anon,authenticated;

commit;
