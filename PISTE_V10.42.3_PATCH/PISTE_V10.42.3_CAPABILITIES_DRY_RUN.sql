-- V10.42.3 — DRY RUN manuel uniquement
begin;

alter table public.coaching_sessions add column if not exists work_mode text;
update public.coaching_sessions set work_mode='legacy' where work_mode is null;
alter table public.coaching_sessions alter column work_mode set default 'team';
alter table public.coaching_sessions drop constraint if exists coaching_sessions_work_mode_check;
alter table public.coaching_sessions add constraint coaching_sessions_work_mode_check check (work_mode in ('legacy','solo','duo','team'));

alter table public.coaching_members add column if not exists capabilities text[] not null default '{}'::text[];

-- Le garde V10.40 conserve l'identité, le rôle et les champs d'invitation.
-- capabilities est serveur-calculé par le trigger ci-dessous et ne peut pas être choisi par le client.
create or replace function private.guard_coaching_member_mutations()
returns trigger language plpgsql security invoker set search_path=''
as $$ declare owner_id uuid; old_rest jsonb; new_rest jsonb; begin
  select s.owner_id into owner_id from public.coaching_sessions s where s.id=old.session_id;
  if owner_id is not null and owner_id=(select auth.uid()) then return new; end if;
  old_rest:=to_jsonb(old)-array['invitation_status','ready_at','updated_at','capabilities'];
  new_rest:=to_jsonb(new)-array['invitation_status','ready_at','updated_at','capabilities'];
  if old_rest<>new_rest then raise exception 'Seuls invitation_status et ready_at sont modifiables'; end if;
  return new;
end $$;

create or replace function private.normalize_coaching_capabilities_v10423()
returns trigger language plpgsql security definer set search_path=''
as $$
declare mode_name text;
begin
 select coalesce(s.work_mode,'legacy') into mode_name from public.coaching_sessions s where s.id=new.session_id;
 if new.role='solo' then new.capabilities:=array['drive','coach','observe'];
 elsif new.role='driver' then new.capabilities:=case when mode_name='duo' then array['drive','coach','observe'] else array['drive','observe'] end;
 elsif new.role='traceur' then new.capabilities:=array['trace','observe'];
 elsif new.role='coach' then new.capabilities:=case when mode_name='duo' then array['trace','observe'] else array['coach','observe'] end;
 else new.capabilities:=array['observe']; end if;
 return new;
end $$;
revoke all on function private.normalize_coaching_capabilities_v10423() from public,anon,authenticated;
drop trigger if exists coaching_members_capabilities_v10423 on public.coaching_members;
create trigger coaching_members_capabilities_v10423 before insert or update of role,session_id,capabilities on public.coaching_members for each row execute function private.normalize_coaching_capabilities_v10423();
update public.coaching_members m set role=m.role;

-- Important : la lecture blind_mode reste fondée sur role, jamais capabilities.
create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
    'workflow_version',coalesce(s.workflow_version,1),
    'work_mode',coalesce(s.work_mode,'legacy'),
    'blind_mode',coalesce(s.blind_mode,'normal'),
    'planned_route',case
      when (coalesce(s.workflow_version,1)<2 and not (s.status<>'ended' and s.visibility_mode='coach' and me.role='driver'))
        or (coalesce(s.workflow_version,1)>=2 and me.invitation_status in ('accepted','active') and (s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))))
      then coalesce(to_jsonb(s.planned_route),'[]'::jsonb) else '[]'::jsonb end,
    'planned_markers',case
      when (coalesce(s.workflow_version,1)<2 and not (s.status<>'ended' and s.visibility_mode='coach' and me.role='driver'))
        or (coalesce(s.workflow_version,1)>=2 and me.invitation_status in ('accepted','active') and (s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))))
      then coalesce(to_jsonb(s.planned_markers),'[]'::jsonb) else '[]'::jsonb end,
    'odor_model',case
      when (coalesce(s.workflow_version,1)<2 and not (s.status<>'ended' and s.visibility_mode='coach' and me.role='driver'))
        or (coalesce(s.workflow_version,1)>=2 and me.invitation_status in ('accepted','active') and (s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))))
      then coalesce(to_jsonb(s.odor_model),'{}'::jsonb) else '{}'::jsonb end,
    'coaching_members',coalesce((select jsonb_agg(jsonb_build_object('role',m.role,'user_id',m.user_id,'capabilities',coalesce(m.capabilities,'{}'::text[]),'invitation_status',m.invitation_status,'ready_at',m.ready_at)) from public.coaching_members m where m.session_id=s.id),'[]'::jsonb)
  ) order by s.created_at desc),'[]'::jsonb)
  from public.coaching_sessions s
  join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
  where (p_session_id is null or s.id=p_session_id) and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

-- Garde débrief : un Conducteur • Coach peut écrire les deux contributions, sans élargir ses lectures.
create or replace function private.guard_coaching_debrief_contributions_v1042()
returns trigger language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); role_name text; caps text[]; session_phase text; session_status text; session_owner uuid; workflow_version integer; invitation_name text; can_drive boolean:=false; can_coach boolean:=false;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 select s.owner_id,coalesce(s.workflow_version,1),s.phase,s.status into session_owner,workflow_version,session_phase,session_status from public.coaching_sessions s where s.id=new.session_id;
 if not found then raise exception 'Session Coaching introuvable'; end if;
 if new.owner_id is distinct from session_owner then raise exception 'owner_id invalide'; end if;
 if workflow_version<2 then return new; end if;
 select m.role,m.invitation_status,coalesce(m.capabilities,'{}'::text[]) into role_name,invitation_name,caps from public.coaching_members m where m.session_id=new.session_id and m.user_id=uid;
 if role_name is null or invitation_name not in ('accepted','active') then raise exception 'Participation Coaching active requise'; end if;
 if session_status<>'ended' and session_phase<>'completed' then raise exception 'Débrief disponible après le parcours'; end if;
 can_drive:=role_name in ('driver','solo') or 'drive'=any(caps);
 can_coach:=role_name in ('coach','solo') or uid=session_owner or 'coach'=any(caps);
 if can_drive and can_coach then
   if tg_op='UPDATE' and (new.session_id is distinct from old.session_id or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at or new.revision is distinct from old.revision) then raise exception 'Métadonnées structurelles du débrief immuables'; end if;
   new.coach_id:=uid; new.last_editor_id:=uid; if tg_op='INSERT' then new.created_at:=statement_timestamp(); new.revision:=1; end if; new.updated_at:=statement_timestamp();
 elsif can_drive then
   if tg_op='UPDATE' then new.last_editor_id:=old.last_editor_id; new.updated_at:=statement_timestamp(); end if;
   if tg_op='INSERT' and (new.coach_id is not null or new.strengths is not null or new.improvement_area is not null or new.coach_notes is not null or new.statistics_notes is not null or new.actual_track<>'[]'::jsonb or new.auto_metrics<>'{}'::jsonb or new.publication_status<>'draft' or new.published_at is not null or new.revision<>1) then raise exception 'Le Conducteur ne peut écrire que son retour'; end if;
   if tg_op='UPDATE' and (new.session_id is distinct from old.session_id or new.owner_id is distinct from old.owner_id or new.coach_id is distinct from old.coach_id or new.strengths is distinct from old.strengths or new.improvement_area is distinct from old.improvement_area or new.coach_notes is distinct from old.coach_notes or new.statistics_notes is distinct from old.statistics_notes or new.actual_track is distinct from old.actual_track or new.auto_metrics is distinct from old.auto_metrics or new.publication_status is distinct from old.publication_status or new.published_at is distinct from old.published_at or new.last_editor_id is distinct from old.last_editor_id or new.revision is distinct from old.revision or new.created_at is distinct from old.created_at) then raise exception 'Analyse du Coach et métadonnées protégées'; end if;
   if tg_op='INSERT' then new.last_editor_id:=null; new.created_at:=statement_timestamp(); end if; new.updated_at:=statement_timestamp();
 elsif can_coach then
   if tg_op='UPDATE' and (new.session_id is distinct from old.session_id or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at or new.revision is distinct from old.revision) then raise exception 'Métadonnées structurelles du débrief immuables'; end if;
   if tg_op='INSERT' and new.driver_notes is not null then raise exception 'Retour du Conducteur protégé'; end if;
   if tg_op='UPDATE' and new.driver_notes is distinct from old.driver_notes then raise exception 'Retour du Conducteur protégé'; end if;
   new.coach_id:=uid; new.last_editor_id:=uid; if tg_op='INSERT' then new.created_at:=statement_timestamp(); new.revision:=1; end if; new.updated_at:=statement_timestamp();
 else raise exception 'Rôle non autorisé pour le débrief'; end if;
 return new;
end $$;
revoke all on function private.guard_coaching_debrief_contributions_v1042() from public,anon,authenticated;

do $$ declare n bigint; begin
 select count(*) into n from information_schema.columns where table_schema='public' and table_name='coaching_sessions' and column_name='work_mode'; if n<>1 then raise exception 'work_mode absent'; end if;
 select count(*) into n from information_schema.columns where table_schema='public' and table_name='coaching_members' and column_name='capabilities'; if n<>1 then raise exception 'capabilities absent'; end if;
 if has_function_privilege('anon','public.get_my_coaching_sessions(uuid)','EXECUTE') then raise exception 'anon ne doit pas exécuter get_my_coaching_sessions'; end if;
 if not has_function_privilege('authenticated','public.get_my_coaching_sessions(uuid)','EXECUTE') then raise exception 'authenticated doit exécuter get_my_coaching_sessions'; end if;
end $$;
rollback;
