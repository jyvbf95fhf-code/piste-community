-- Local-only rollback for PISTE_V10.54_SOLO_MODES.sql.
-- Run only inside the ephemeral validation database.
begin;
drop function if exists public.finish_solo_run_v1054(uuid);
drop function if exists public.start_solo_driver_run_v1054(uuid);
drop function if exists public.mark_external_traceur_ready_v1054(uuid,text);
drop function if exists public.finish_solo_laying_v1054(uuid);
drop function if exists public.start_solo_laying_v1054(uuid);
drop function if exists public.get_my_coaching_sessions_v1054(uuid);
drop function if exists public.create_coaching_people_session_v1054(uuid,jsonb,text,text,text,text);
drop index if exists public.coaching_sessions_solo_creation_key_v1054;
alter table public.coaching_sessions drop constraint if exists coaching_sessions_solo_mode_v1054;
alter table public.coaching_sessions drop column if exists solo_creation_key;
alter table public.coaching_sessions drop column if exists solo_mode;
create or replace function private.guard_people_session_v10423()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if tg_op='INSERT' then
    if coalesce(new.workflow_version,1)>=2 and new.visibility_version is distinct from 3 then
      raise exception 'Utilisez la création Coaching par personnes';
    end if;
    if new.visibility_version is not null and
       (new.visibility_version<>3 or coalesce(current_setting('piste.people_creation',true),'off')<>'on') then
      raise exception 'Utilisez la création Coaching sécurisée';
    end if;
  else
    if new.visibility_version is distinct from old.visibility_version then
      raise exception 'Version de visibilité immuable';
    end if;
    if old.visibility_version=3 and (
      new.owner_id is distinct from old.owner_id or
      new.blind_mode is distinct from old.blind_mode or
      new.route_id is distinct from old.route_id or
      new.planned_route is distinct from old.planned_route or
      new.planned_markers is distinct from old.planned_markers or
      new.odor_model is distinct from old.odor_model or
      new.departure_point is distinct from old.departure_point or
      new.laying_mode is distinct from old.laying_mode or
      new.traceur_mode is distinct from old.traceur_mode) then
      raise exception 'Préparation, visibilité et mode Traceur immuables';
    end if;
    if old.visibility_version=3 and coalesce(current_setting('piste.v1040_transition',true),'off')<>'on'
       and (new.phase is distinct from old.phase or new.laying_started_at is distinct from old.laying_started_at
         or new.track_finished_at is distinct from old.track_finished_at
         or new.driver_started_at is distinct from old.driver_started_at
         or new.driver_finished_at is distinct from old.driver_finished_at
         or (new.status is distinct from old.status and new.status<>'cancelled')) then
      raise exception 'Utilisez les transitions sécurisées';
    end if;
  end if;
  return new;
end $$;
create or replace function private.can_record_people_point_v10423(p_session_id uuid,p_owner_id uuid,p_trace boolean)
returns boolean language sql stable security definer set search_path=''
as $$ select coalesce((select s.visibility_version is distinct from 3 or
  (m.user_id=(select auth.uid()) and p_owner_id=m.user_id and m.invitation_status in ('accepted','active')
   and s.status='live' and ((p_trace and m.role='traceur' and s.phase='laying')
     or (not p_trace and m.role='driver' and s.phase='driver_running')))
  from public.coaching_sessions s left join public.coaching_members m
    on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false) $$;
revoke all on function private.can_record_people_point_v10423(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.can_record_people_point_v10423(uuid,uuid,boolean) to authenticated;
commit;
