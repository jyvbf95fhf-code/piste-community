-- V10.54 — Solo self_trace / external_traceur (HARDENED, NOT APPLIED)
--
-- This file is intentionally additive and must be reviewed and applied only on
-- an isolated Supabase test environment. It has not been executed by the
-- repository tooling.  V10.53 functions remain available for old clients and
-- old sessions.

begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $preflight$
begin
  if to_regclass('public.coaching_sessions') is null
     or to_regclass('public.coaching_members') is null
     or to_regclass('private.coaching_deferred_v1045') is null then
    raise exception 'Prérequis Coaching V10.54 absent';
  end if;
  if to_regprocedure('public.create_coaching_people_session_v1053(uuid,jsonb,text,text)') is null
     or to_regprocedure('public.get_my_coaching_sessions(uuid)') is null
     or to_regprocedure('public.finish_coaching_track_v1049(uuid)') is null then
    raise exception 'RPC Coaching V10.53 requise absente';
  end if;
end $preflight$;

alter table public.coaching_sessions
  add column if not exists solo_mode text;

-- Optional retry key.  Existing callers remain valid; new callers may provide
-- a stable key to make a Solo creation retry-safe without a frontend change.
alter table public.coaching_sessions
  add column if not exists solo_creation_key text;
create unique index if not exists coaching_sessions_solo_creation_key_v1054
  on public.coaching_sessions(owner_id,solo_creation_key)
  where solo_creation_key is not null;

alter table public.coaching_sessions
  drop constraint if exists coaching_sessions_solo_mode_v1054;
alter table public.coaching_sessions
  add constraint coaching_sessions_solo_mode_v1054
  check (solo_mode is null or solo_mode in ('self_trace','external_traceur'));

-- Keep the new discriminator immutable after creation, like the existing
-- route/visibility/traceur fields.  This is a guard only; it does not widen RLS.
create or replace function private.guard_people_session_v10423()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if tg_op='INSERT' then
    if coalesce(new.workflow_version,1)>=2 and new.visibility_version is distinct from 3 then
      raise exception 'Utilisez la création Coaching par personnes';
    end if;
    if new.visibility_version is not null
       and (new.visibility_version<>3 or coalesce(current_setting('piste.people_creation',true),'off')<>'on') then
      raise exception 'Utilisez la création Coaching sécurisée';
    end if;
  else
    if new.visibility_version is distinct from old.visibility_version then
      raise exception 'Version de visibilité immuable';
    end if;
    if old.visibility_version=3 and (
      new.owner_id is distinct from old.owner_id
      or new.blind_mode is distinct from old.blind_mode
      or new.route_id is distinct from old.route_id
      or new.planned_route is distinct from old.planned_route
      or new.planned_markers is distinct from old.planned_markers
      or new.odor_model is distinct from old.odor_model
      or new.departure_point is distinct from old.departure_point
      or new.laying_mode is distinct from old.laying_mode
      or new.traceur_mode is distinct from old.traceur_mode
      or new.solo_mode is distinct from old.solo_mode
    ) then
      raise exception 'Préparation, visibilité et modes immuables';
    end if;
    if old.visibility_version=3
       and coalesce(current_setting('piste.v1040_transition',true),'off')<>'on'
       and (new.phase is distinct from old.phase
         or new.laying_started_at is distinct from old.laying_started_at
         or new.track_finished_at is distinct from old.track_finished_at
         or new.driver_started_at is distinct from old.driver_started_at
         or new.driver_finished_at is distinct from old.driver_finished_at
         or (new.status is distinct from old.status and new.status<>'cancelled')) then
      raise exception 'Utilisez les transitions sécurisées';
    end if;
  end if;
  return new;
end $$;

-- Keep the existing RLS policies and narrow their shared helper instead of
-- adding a permissive policy. New V10.54 sessions are accepted only for an
-- explicit self_trace mode and the matching recording phase/table. Production
-- already contains active V10.53 Solo sessions with no solo_mode column; the
-- null branch below is a deliberately narrow compatibility fallback for those
-- legacy sessions. V10.54 creation always writes a non-null mode, so a new
-- session cannot acquire this fallback accidentally. external_traceur never
-- receives a laying/trace-points permission.
create or replace function private.can_record_people_point_v10423(p_session_id uuid,p_owner_id uuid,p_trace boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select s.visibility_version is distinct from 3
   or (m.user_id=(select auth.uid())
       and p_owner_id=m.user_id
       and m.invitation_status in ('accepted','active')
       and s.status='live'
       and (
         (p_trace and (
           (m.role='traceur' and s.phase='laying')
           or (m.role='solo' and (
             (s.solo_mode='self_trace' and s.phase='laying')
             or (s.solo_mode is null and s.phase='laying')
           ))
         ))
         or
         ((not p_trace) and (
           (m.role='driver' and s.phase='driver_running')
           or (m.role='solo' and (
             (s.solo_mode in ('self_trace','external_traceur') and s.phase='driver_running')
             or (s.solo_mode is null and s.phase='driver_running')
           ))
         ))
       ))
   from public.coaching_sessions s
   left join public.coaching_members m
     on m.session_id=s.id and m.user_id=(select auth.uid())
   where s.id=p_session_id),false)
$$;
revoke all on function private.can_record_people_point_v10423(uuid,uuid,boolean) from public,anon;
grant execute on function private.can_record_people_point_v10423(uuid,uuid,boolean) to authenticated;

-- Versioned creation RPC.  The V10.53 signature is deliberately untouched.
create or replace function public.create_coaching_people_session_v1054(
  p_route_id uuid,
  p_members jsonb,
  p_blind_mode text,
  p_traceur_mode text default 'connected',
  p_solo_mode text default null,
  p_idempotency_key text default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := (select auth.uid());
  route public.training_routes;
  sid uuid;
  item jsonb;
  member_id uuid;
  member_role text;
  existing_session public.coaching_sessions;
  is_solo boolean := false;
  external_mode boolean := false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  if p_blind_mode is null or p_blind_mode not in ('normal','simple_blind','full_blind') then
    raise exception 'Mode de visibilité invalide';
  end if;
  if coalesce(p_traceur_mode,'connected') not in ('connected','external') then
    raise exception 'Mode Traceur invalide';
  end if;
  if p_solo_mode is not null and p_solo_mode not in ('self_trace','external_traceur') then
    raise exception 'Sous-mode Solo invalide';
  end if;
  if p_idempotency_key is not null and (p_solo_mode is null or length(trim(p_idempotency_key))=0 or length(p_idempotency_key)>128) then
    raise exception 'Clé d’idempotence Solo invalide';
  end if;
  external_mode := coalesce(p_traceur_mode,'connected')='external';
  if jsonb_typeof(p_members) is distinct from 'array' then raise exception 'Liste de personnes requise'; end if;
  if exists(select 1 from jsonb_array_elements(p_members) m
            where m->>'user_id' is null
               or coalesce(m->>'role','') not in ('coach','traceur','driver','observer','solo')) then
    raise exception 'Rôle ou personne invalide';
  end if;
  if (select count(*) from jsonb_array_elements(p_members)) < 1
     or (select count(*) from jsonb_array_elements(p_members))
        <> (select count(distinct (m->>'user_id')::uuid) from jsonb_array_elements(p_members) m) then
    raise exception 'Chaque personne doit apparaître une seule fois';
  end if;
  is_solo := exists(select 1 from jsonb_array_elements(p_members) m where m->>'role'='solo');
  if is_solo then
    -- external_traceur has one authenticated solo member only: no Traceur
    -- application member, invitation, or synthetic GPS identity is inserted.
    if p_solo_mode is null then raise exception 'Sous-mode Solo requis'; end if;
    if (select count(*) from jsonb_array_elements(p_members))<>1
       or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='solo')<>1
       or not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role'='solo') then
      raise exception 'Le mode Solo exige un seul utilisateur applicatif';
    end if;
    if p_solo_mode='self_trace' and external_mode then
      raise exception 'self_trace ne peut pas utiliser un Traceur externe';
    end if;
    if p_solo_mode='external_traceur' and not external_mode then
      raise exception 'external_traceur exige le mode Traceur externe';
    end if;
  elsif p_solo_mode is not null then
    raise exception 'solo_mode est réservé aux sessions Solo';
  elsif external_mode then
    if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='traceur')<>0
       or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='driver')<>1
       or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1
       or not exists(select 1 from jsonb_array_elements(p_members) m
                     where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver')) then
      raise exception 'Le mode Traceur externe exige un Conducteur et aucun Traceur applicatif';
    end if;
  else
    if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='driver')<>1
       or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='traceur')<>1 then
      raise exception 'Choisissez exactement un Conducteur et un Traceur.';
    end if;
    if not exists(select 1 from jsonb_array_elements(p_members) m
                  where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','traceur','driver')) then
      raise exception 'Choisissez votre propre rôle';
    end if;
  end if;
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_idempotency_key,0));
    select * into existing_session
    from public.coaching_sessions
    where owner_id=uid and solo_creation_key=p_idempotency_key
    order by created_at desc
    limit 1;
    if existing_session.id is not null then
      if existing_session.solo_mode is distinct from p_solo_mode then
        raise exception 'Clé d’idempotence déjà utilisée pour un autre mode Solo';
      end if;
      return jsonb_build_object('id',existing_session.id,'session_mode','solo',
        'solo_mode',existing_session.solo_mode,'traceur_mode',existing_session.traceur_mode,
        'idempotent_replay',true);
    end if;
  end if;
  if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1 then
    raise exception 'Choisissez au maximum un Coach';
  end if;

  if p_route_id is not null then
    select * into route from public.training_routes where id=p_route_id and owner_id=uid;
    if route.id is null or jsonb_array_length(route.route)<2 then
      raise exception 'Tracé préparé personnel requis';
    end if;
    if exists(select 1 from jsonb_array_elements(route.route) p
              where jsonb_typeof(p->'lat') is distinct from 'number'
                 or jsonb_typeof(p->'lon') is distinct from 'number'
                 or (p->>'lat')::numeric not between -90 and 90
                 or (p->>'lon')::numeric not between -180 and 180) then
      raise exception 'Coordonnées du tracé invalides';
    end if;
  elsif not (is_solo or external_mode or exists(select 1 from jsonb_array_elements(p_members) m
                                                 where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver'))) then
    raise exception 'Tracé préparé personnel requis';
  end if;

  for item in select value from jsonb_array_elements(p_members) loop
    member_id := (item->>'user_id')::uuid;
    if member_id<>uid and not exists(select 1 from public.friendships f where f.status='accepted'
      and ((f.requester=uid and f.addressee=member_id) or (f.addressee=uid and f.requester=member_id))) then
      raise exception 'Cette personne ne fait pas partie de vos amis';
    end if;
  end loop;

  perform set_config('piste.people_creation','on',true);
  insert into public.coaching_sessions(
    owner_id,route_id,name,status,workflow_version,visibility_version,blind_mode,visibility_mode,solo_creation_key,
    laying_mode,traceur_mode,solo_mode,planned_route,planned_markers,odor_model,departure_point,invite_code,expires_at
  ) values(
    uid,route.id,'Coaching · '||to_char(now(),'DD/MM/YYYY'),'waiting',2,3,p_blind_mode,'all',p_idempotency_key,
    'traceur',coalesce(p_traceur_mode,'connected'),case when is_solo then p_solo_mode else null end,
    coalesce(route.route,'[]'::jsonb),coalesce(route.waypoints,'[]'::jsonb),coalesce(route.odor_model,'{}'::jsonb),
    case when route.id is null then '{}'::jsonb else jsonb_build_object('lat',route.route->0->'lat','lon',route.route->0->'lon') end,
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),now()+interval '7 days'
  ) returning id into sid;
  for item in select value from jsonb_array_elements(p_members) loop
    member_id := (item->>'user_id')::uuid;
    member_role := item->>'role';
    insert into public.coaching_members(session_id,user_id,role,invitation_status)
    values(sid,member_id,member_role,case when member_id=uid then 'accepted' else 'invited' end);
  end loop;
  insert into private.coaching_deferred_v1045(session_id) values(sid);
  perform set_config('piste.people_creation','off',true);
  return jsonb_build_object('id',sid,'session_mode',case when is_solo then 'solo' else 'standard' end,
    'solo_mode',case when is_solo then p_solo_mode else null end,
    'traceur_mode',coalesce(p_traceur_mode,'connected'));
end $$;
revoke all on function public.create_coaching_people_session_v1054(uuid,jsonb,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v1054(uuid,jsonb,text,text,text,text) to authenticated;

-- Additive projection for future clients; the V10.53 projection remains intact.
create or replace function public.get_my_coaching_sessions_v1054(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(row || jsonb_build_object('solo_mode',s.solo_mode) order by s.created_at desc),'[]'::jsonb)
  from jsonb_array_elements(public.get_my_coaching_sessions(p_session_id)) row
  join public.coaching_sessions s on s.id=(row->>'id')::uuid
$$;
revoke all on function public.get_my_coaching_sessions_v1054(uuid) from public,anon,authenticated;
grant execute on function public.get_my_coaching_sessions_v1054(uuid) to authenticated;

create or replace function public.start_solo_laying_v1054(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid());
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.solo_mode<>'self_trace' then raise exception 'Session Solo self_trace requise'; end if;
  if not exists(select 1 from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')) then
    raise exception 'Utilisateur Solo autorisé requis';
  end if;
  if r.phase='laying' and r.status='live' then return r; end if;
  if r.phase<>'preparation' or r.status not in ('waiting','live') then raise exception 'Départ de pose invalide'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='laying',status='live',laying_started_at=coalesce(laying_started_at,statement_timestamp()) where id=r.id returning * into r;
  return r;
end $$;
revoke all on function public.start_solo_laying_v1054(uuid) from public,anon,authenticated;
grant execute on function public.start_solo_laying_v1054(uuid) to authenticated;

create or replace function public.finish_solo_laying_v1054(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); ready_at timestamptz:=statement_timestamp();
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.solo_mode<>'self_trace' then raise exception 'Session Solo self_trace requise'; end if;
  if not exists(select 1 from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')) then
    raise exception 'Utilisateur Solo autorisé requis';
  end if;
  if r.phase='waiting_ready' and r.status='waiting' then return r; end if;
  if r.phase<>'laying' or r.status<>'live' then raise exception 'Fin de pose invalide'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='waiting',phase='waiting_ready',track_finished_at=coalesce(track_finished_at,ready_at) where id=r.id returning * into r;
  update private.coaching_deferred_v1045 set search_mode='immediate',traceur_ready_at=coalesce(traceur_ready_at,ready_at) where session_id=r.id;
  return r;
end $$;
revoke all on function public.finish_solo_laying_v1054(uuid) from public,anon,authenticated;
grant execute on function public.finish_solo_laying_v1054(uuid) to authenticated;

create or replace function public.mark_external_traceur_ready_v1054(p_session_id uuid,p_search_mode text)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); ready_at timestamptz:=statement_timestamp();
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  if p_search_mode is null or p_search_mode not in ('immediate','deferred') then raise exception 'Type de recherche invalide'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.solo_mode<>'external_traceur' or r.traceur_mode<>'external' then raise exception 'Session Solo Traceur externe requise'; end if;
  if not exists(select 1 from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')) then
    raise exception 'Utilisateur Solo autorisé requis';
  end if;
  if r.phase='waiting_ready' and r.status='waiting' then return r; end if;
  if r.phase<>'preparation' or r.status not in ('waiting','live') or r.driver_started_at is not null then raise exception 'Session externe non prête'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='waiting',phase='waiting_ready',track_finished_at=coalesce(track_finished_at,ready_at) where id=r.id returning * into r;
  update private.coaching_deferred_v1045 set search_mode=p_search_mode,traceur_ready_at=coalesce(traceur_ready_at,ready_at) where session_id=r.id;
  return r;
end $$;
revoke all on function public.mark_external_traceur_ready_v1054(uuid,text) from public,anon,authenticated;
grant execute on function public.mark_external_traceur_ready_v1054(uuid,text) to authenticated;

create or replace function public.start_solo_driver_run_v1054(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid; ready_at timestamptz;
begin
  uid:=(select auth.uid());
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.solo_mode not in ('self_trace','external_traceur') then raise exception 'Session Solo V10.54 requise'; end if;
  if not exists(select 1 from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')) then raise exception 'Utilisateur Solo autorisé requis'; end if;
  if r.phase='driver_running' and r.status='live' then return r; end if;
  select d.traceur_ready_at into ready_at from private.coaching_deferred_v1045 d where d.session_id=r.id;
  if r.phase<>'waiting_ready' or r.status not in ('waiting','live') or r.track_finished_at is null or (r.solo_mode='external_traceur' and ready_at is null) then
    raise exception 'La session Solo n’est pas prête pour la relève';
  end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='driver_running',status='live',driver_started_at=coalesce(driver_started_at,statement_timestamp()) where id=r.id returning * into r;
  return r;
end $$;
revoke all on function public.start_solo_driver_run_v1054(uuid) from public,anon,authenticated;
grant execute on function public.start_solo_driver_run_v1054(uuid) to authenticated;

create or replace function public.finish_solo_run_v1054(p_session_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); finished boolean;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null or r.solo_mode not in ('self_trace','external_traceur') then raise exception 'Session Solo V10.54 requise'; end if;
  if not exists(select 1 from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.role='solo' and m.invitation_status in ('accepted','active')) then raise exception 'Utilisateur Solo autorisé requis'; end if;
  if r.status='ended' or r.debrief_status in ('track_finished','in_progress','closed') then return true; end if;
  if r.status<>'live' or r.phase<>'driver_running' then raise exception 'Parcours Solo non actif'; end if;
  select public.finish_coaching_track_v1049(p_session_id) into finished;
  return coalesce(finished,false);
end $$;
revoke all on function public.finish_solo_run_v1054(uuid) from public,anon,authenticated;
grant execute on function public.finish_solo_run_v1054(uuid) to authenticated;

-- Rollback (manual, only after explicit approval):
-- drop function public.finish_solo_run_v1054(uuid);
-- drop function public.start_solo_driver_run_v1054(uuid);
-- drop function public.mark_external_traceur_ready_v1054(uuid,text);
-- drop function public.finish_solo_laying_v1054(uuid);
-- drop function public.start_solo_laying_v1054(uuid);
-- drop function public.get_my_coaching_sessions_v1054(uuid);
-- drop function public.create_coaching_people_session_v1054(uuid,jsonb,text,text,text,text);
-- alter table public.coaching_sessions drop constraint coaching_sessions_solo_mode_v1054;
-- drop index if exists public.coaching_sessions_solo_creation_key_v1054;
-- alter table public.coaching_sessions drop column if exists solo_creation_key;
--
-- Restore the production-compatible V10.53 recording helper before removing
-- solo_mode. Production already includes the V10.49.1C Solo exception, and
-- rollback must preserve that behavior for active legacy sessions. This is the
-- complete prior definition, so rollback does not depend on another file:
-- create or replace function private.can_record_people_point_v10423(p_session_id uuid,p_owner_id uuid,p_trace boolean)
-- returns boolean language sql stable security definer set search_path='' as $$
--  select coalesce((select s.visibility_version is distinct from 3 or
--   (m.user_id=(select auth.uid()) and p_owner_id=m.user_id and m.invitation_status in ('accepted','active') and s.status='live' and
--   ((p_trace and m.role in ('traceur','solo') and s.phase='laying') or (not p_trace and m.role in ('driver','solo') and s.phase='driver_running')))
--   from public.coaching_sessions s left join public.coaching_members m on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false)
-- $$;
-- revoke all on function private.can_record_people_point_v10423(uuid,uuid,boolean) from public,anon;
-- grant execute on function private.can_record_people_point_v10423(uuid,uuid,boolean) to authenticated;
--
-- Restore private.guard_people_session_v10423() autonomously before dropping
-- solo_mode.  The complete V10.53 body is included here; no external file or
-- DROP ... CASCADE is required:
-- create or replace function private.guard_people_session_v10423()
-- returns trigger language plpgsql security invoker set search_path=''
-- as $$
-- begin
--   if tg_op='INSERT' then
--     if coalesce(new.workflow_version,1)>=2 and new.visibility_version is distinct from 3 then
--       raise exception 'Utilisez la création Coaching par personnes';
--     end if;
--     if new.visibility_version is not null
--        and (new.visibility_version<>3 or coalesce(current_setting('piste.people_creation',true),'off')<>'on') then
--       raise exception 'Utilisez la création Coaching sécurisée';
--     end if;
--   else
--     if new.visibility_version is distinct from old.visibility_version then
--       raise exception 'Version de visibilité immuable';
--     end if;
--     if old.visibility_version=3 and (
--       new.owner_id is distinct from old.owner_id
--       or new.blind_mode is distinct from old.blind_mode
--       or new.route_id is distinct from old.route_id
--       or new.planned_route is distinct from old.planned_route
--       or new.planned_markers is distinct from old.planned_markers
--       or new.odor_model is distinct from old.odor_model
--       or new.departure_point is distinct from old.departure_point
--       or new.laying_mode is distinct from old.laying_mode
--       or new.traceur_mode is distinct from old.traceur_mode
--     ) then
--       raise exception 'Préparation, visibilité et mode Traceur immuables';
--     end if;
--     if old.visibility_version=3
--        and coalesce(current_setting('piste.v1040_transition',true),'off')<>'on'
--        and (new.phase is distinct from old.phase
--          or new.laying_started_at is distinct from old.laying_started_at
--          or new.track_finished_at is distinct from old.track_finished_at
--          or new.driver_started_at is distinct from old.driver_started_at
--          or new.driver_finished_at is distinct from old.driver_finished_at
--          or (new.status is distinct from old.status and new.status<>'cancelled')) then
--       raise exception 'Utilisez les transitions sécurisées';
--     end if;
--   end if;
--   return new;
-- end $$;
--
-- alter table public.coaching_sessions drop constraint coaching_sessions_solo_mode_v1054;
-- alter table public.coaching_sessions drop column solo_mode;

commit;
