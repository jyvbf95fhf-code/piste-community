-- V10.41 : workflow Coaching simplifié et modes aveugles explicites.
-- Migration à exécuter manuellement après validation. Non destructive et idempotente.
begin;

alter table if exists public.coaching_sessions
  add column if not exists blind_mode text not null default 'normal';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='coaching_sessions_blind_mode_v1041') then
    alter table public.coaching_sessions add constraint coaching_sessions_blind_mode_v1041
      check (blind_mode in ('normal','simple_blind','full_blind')) not valid;
  end if;
end $$;

create or replace function public.mark_coaching_track_ready(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path=''
as $$ declare r public.coaching_sessions; role_name text; uid uuid := (select auth.uid()); begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if coalesce(r.workflow_version,1)<>2 then raise exception 'Session legacy : workflow V10.41 indisponible'; end if;
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if not ((r.owner_id=uid and r.laying_mode='coach') or (role_name='traceur' and r.laying_mode='traceur')) then raise exception 'Rôle non autorisé pour déclarer la piste prête'; end if;
  if r.phase='waiting_ready' then return r; end if;
  if r.status<>'waiting' or coalesce(r.phase,'preparation')<>'preparation' then raise exception 'Transition vers piste prête invalide'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='waiting_ready',track_finished_at=coalesce(track_finished_at,now()) where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.start_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path=''
as $$ declare r public.coaching_sessions; role_name text; uid uuid := (select auth.uid()); begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if coalesce(r.workflow_version,1)<>2 then raise exception 'Session legacy : workflow V10.41 indisponible'; end if;
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name<>'driver' then raise exception 'Seul le Conducteur peut démarrer son parcours'; end if;
  if r.phase='driver_running' and r.status='live' then return r; end if;
  if r.status<>'waiting' and r.status<>'live' then raise exception 'Session non disponible pour le départ'; end if;
  if r.phase not in ('waiting_ready','coach_ready') then raise exception 'La piste doit être prête avant le départ'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='live',phase='driver_running',driver_started_at=coalesce(driver_started_at,now()) where id=r.id returning * into r;
  return r;
end $$;

-- Le RPC filtré devient la source des colonnes sensibles pour les sessions V10.40.
create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
    'workflow_version',coalesce(s.workflow_version,1),
    'blind_mode',coalesce(s.blind_mode,'normal'),
    'planned_route',case when coalesce(s.workflow_version,1)<2 or s.status in ('ended','cancelled') or coalesce(s.phase,'preparation')='completed' or coalesce(s.blind_mode,'normal')='normal' or (s.blind_mode='simple_blind' and me.role in ('coach','traceur','observer','solo')) or (s.blind_mode='full_blind' and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach'))) then coalesce(to_jsonb(s.planned_route),'[]'::jsonb) else '[]'::jsonb end,
    'planned_markers',case when coalesce(s.workflow_version,1)<2 or s.status in ('ended','cancelled') or coalesce(s.phase,'preparation')='completed' or coalesce(s.blind_mode,'normal')='normal' or (s.blind_mode='simple_blind' and me.role in ('coach','traceur','observer','solo')) or (s.blind_mode='full_blind' and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach'))) then coalesce(to_jsonb(s.planned_markers),'[]'::jsonb) else '[]'::jsonb end,
    'odor_model',case when coalesce(s.workflow_version,1)<2 or s.status in ('ended','cancelled') or coalesce(s.phase,'preparation')='completed' or coalesce(s.blind_mode,'normal')='normal' or (s.blind_mode='simple_blind' and me.role in ('coach','traceur','observer','solo')) or (s.blind_mode='full_blind' and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach'))) then coalesce(to_jsonb(s.odor_model),'{}'::jsonb) else '{}'::jsonb end,
    'coaching_members',coalesce((select jsonb_agg(jsonb_build_object('role',m.role,'user_id',m.user_id,'invitation_status',m.invitation_status,'ready_at',m.ready_at)) from public.coaching_members m where m.session_id=s.id),'[]'::jsonb)
  ) order by s.created_at desc),'[]'::jsonb)
  from public.coaching_sessions s join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
  where (p_session_id is null or s.id=p_session_id) and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

revoke execute on function public.mark_coaching_track_ready(uuid) from public,anon;
grant execute on function public.mark_coaching_track_ready(uuid) to authenticated;
revoke execute on function public.start_driver_run(uuid) from public,anon;
grant execute on function public.start_driver_run(uuid) to authenticated;

commit;

select column_name,data_type,column_default from information_schema.columns where table_schema='public' and table_name='coaching_sessions' and column_name='blind_mode';
select routine_name from information_schema.routines where routine_schema='public' and routine_name in ('mark_coaching_track_ready','start_driver_run');
