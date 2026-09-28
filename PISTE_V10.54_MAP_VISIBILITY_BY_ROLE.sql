-- V10.54 Bloc 4B — visibilité explicite du tracé de référence par rôle
-- MIGRATION PREPARED — NOT APPLIED
-- Cette migration est additive et doit être validée sur un environnement isolé
-- avant toute application. Elle ne modifie pas PISTE_V10.54_SOLO_MODES.sql.

begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

alter table public.coaching_sessions
  add column if not exists map_visibility_by_role jsonb null;

alter table public.coaching_sessions
  drop constraint if exists coaching_sessions_map_visibility_by_role_v1054;
alter table public.coaching_sessions
  add constraint coaching_sessions_map_visibility_by_role_v1054
  check (
    map_visibility_by_role is null
    or (
      jsonb_typeof(map_visibility_by_role)='object'
      and jsonb_typeof(map_visibility_by_role->'coach')='boolean'
      and jsonb_typeof(map_visibility_by_role->'traceur')='boolean'
      and jsonb_typeof(map_visibility_by_role->'driver')='boolean'
      and jsonb_typeof(map_visibility_by_role->'observer')='boolean'
    )
  ) not valid;

-- Effective values are derived server-side. locked/editable/reason remain UI
-- metadata and are never trusted as persisted permissions.
create or replace function private.resolve_coaching_map_visibility_v1054(
  p_visibility text,
  p_laying_mode text,
  p_role text,
  p_config jsonb default null,
  p_status text default null,
  p_phase text default null
)
returns boolean
language plpgsql
stable
security invoker
set search_path=''
as $$
declare chosen boolean;
begin
  if p_status='ended' or p_phase='completed' then return true; end if;
  if p_visibility='normal' then
    chosen:=case when jsonb_typeof(p_config->p_role)='boolean' then (p_config->>p_role)::boolean else true end;
    return chosen;
  end if;
  if p_visibility='simple_blind' then
    if p_role in ('coach','traceur') then return true; end if;
    if p_role='driver' then return false; end if;
    return case when jsonb_typeof(p_config->'observer')='boolean' then (p_config->>'observer')::boolean else true end;
  end if;
  if p_visibility='full_blind' then
    if p_role='traceur' then return true; end if;
    if p_role='coach' and p_laying_mode='coach' then return true; end if;
    return false;
  end if;
  return false;
end $$;

-- Versioned creation wrapper. The V10.53 RPC remains available and is used for
-- the atomic session/member creation; this wrapper validates and persists only
-- the effective role decisions after that creation. It is intentionally not
-- wired by the current frontend until this migration is applied and verified.
create or replace function public.create_coaching_people_session_v1054(
  p_route_id uuid,
  p_members jsonb,
  p_blind_mode text,
  p_traceur_mode text default 'connected',
  p_map_visibility_by_role jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare created jsonb; sid uuid; cfg jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise' using errcode='42501'; end if;
  if p_map_visibility_by_role is not null and jsonb_typeof(p_map_visibility_by_role)<>'object' then raise exception 'Visibilité de carte invalide'; end if;
  cfg:=jsonb_build_object(
    'coach',coalesce((p_map_visibility_by_role->>'coach')::boolean,true),
    'traceur',coalesce((p_map_visibility_by_role->>'traceur')::boolean,true),
    'driver',coalesce((p_map_visibility_by_role->>'driver')::boolean,true),
    'observer',coalesce((p_map_visibility_by_role->>'observer')::boolean,true)
  );
  created:=public.create_coaching_people_session_v1053(p_route_id,p_members,p_blind_mode,p_traceur_mode);
  sid:=(created->>'id')::uuid;
  update public.coaching_sessions
     set map_visibility_by_role=cfg
   where id=sid and owner_id=(select auth.uid()) and visibility_version=3;
  return jsonb_set(created,'{map_visibility_by_role}',cfg,true);
end $$;
revoke all on function public.create_coaching_people_session_v1054(uuid,jsonb,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v1054(uuid,jsonb,text,text,jsonb) to authenticated;

-- Server-side projection wrapper. It delegates legacy shaping to the existing
-- projection, then strips reference-route fields when the effective decision
-- denies them. No hidden route is recovered from the client.
create or replace function public.get_my_coaching_sessions_v1054(p_session_id uuid default null)
returns setof jsonb
language sql
stable
security definer
set search_path=''
as $$
  select case
    when s.visibility_version=3
     and s.map_visibility_by_role is not null
     and not private.resolve_coaching_map_visibility_v1054(
       s.blind_mode,s.laying_mode,me.role,s.map_visibility_by_role,s.status,s.phase
     )
    then row #- '{planned_route}' #- '{planned_markers}' #- '{odor_model}' #- '{departure_point}'
    else row
  end
  from jsonb_array_elements(public.get_my_coaching_sessions(p_session_id)) as item(row)
  join public.coaching_sessions s on s.id=(row->>'id')::uuid
  join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
  where me.invitation_status<>'declined';
$$;
revoke all on function public.get_my_coaching_sessions_v1054(uuid) from public,anon,authenticated;
grant execute on function public.get_my_coaching_sessions_v1054(uuid) to authenticated;

-- Rollback (manual, after dependency review):
-- drop function public.get_my_coaching_sessions_v1054(uuid);
-- drop function public.create_coaching_people_session_v1054(uuid,jsonb,text,text,jsonb);
-- drop function private.resolve_coaching_map_visibility_v1054(text,text,text,jsonb,text,text);
-- alter table public.coaching_sessions drop constraint if exists coaching_sessions_map_visibility_by_role_v1054;
-- alter table public.coaching_sessions drop column if exists map_visibility_by_role;

commit;
