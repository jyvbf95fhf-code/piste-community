begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- V10.49.1b prepared migration. Do not execute from this repository.
-- Scope: explicit one-person `solo` sessions and code admission as Conducteur.
-- Normal multi-role sessions retain the V10.45 role requirements.

do $preflight$
begin
  if to_regprocedure('public.create_coaching_people_session_v1045(uuid,jsonb,text)') is null then
    raise exception 'RPC V10.45 absente : migration interrompue';
  end if;
  if to_regprocedure('private.join_coaching_session(text,text)') is null
     or to_regprocedure('public.join_coaching_session(text,text)') is null then
    raise exception 'RPC join par code absente : migration interrompue';
  end if;
  if to_regclass('public.coaching_sessions') is null
     or to_regclass('public.coaching_members') is null then
    raise exception 'Tables Coaching absentes : migration interrompue';
  end if;
end $preflight$;

create or replace function public.create_coaching_people_session_v1045(
  p_route_id uuid,
  p_members jsonb,
  p_blind_mode text default 'normal'
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  route public.training_routes;
  sid uuid;
  item jsonb;
  member_id uuid;
  member_role text;
  without_route boolean;
  solo_mode boolean := false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  if p_blind_mode is null or p_blind_mode not in ('normal','simple_blind','full_blind') then raise exception 'Mode de visibilité invalide'; end if;
  if jsonb_typeof(p_members) is distinct from 'array' then raise exception 'Liste de personnes requise'; end if;
  if exists(select 1 from jsonb_array_elements(p_members) m where m->>'user_id' is null or coalesce(m->>'role','') not in ('coach','traceur','driver','observer','solo')) then raise exception 'Rôle ou personne invalide'; end if;
  if (select count(*) from jsonb_array_elements(p_members))<>(select count(distinct (m->>'user_id')::uuid) from jsonb_array_elements(p_members) m) then raise exception 'Chaque personne doit apparaître une seule fois'; end if;
  solo_mode := exists(select 1 from jsonb_array_elements(p_members) m where m->>'role'='solo');
  if solo_mode then
    if (select count(*) from jsonb_array_elements(p_members))<>1
       or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='solo')<>1
       or not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role'='solo')
       or p_route_id is not null then
      raise exception 'Le mode solo exige une seule personne, sans tracé préparé';
    end if;
  else
    if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='driver')<>1 or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
    if not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','traceur','driver')) then raise exception 'Choisissez votre propre rôle'; end if;
  end if;
  if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1 then raise exception 'Choisissez au maximum un Coach'; end if;
  without_route := solo_mode or exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver'));
  if without_route then
    if not solo_mode and p_route_id is not null then raise exception 'Le Traceur distinct pose la piste : aucun tracé du Coach ou du Conducteur'; end if;
  else
    select * into route from public.training_routes where id=p_route_id and owner_id=uid;
    if route.id is null or jsonb_array_length(route.route)<2 then raise exception 'Tracé préparé personnel requis'; end if;
    if exists(select 1 from jsonb_array_elements(route.route) p where jsonb_typeof(p->'lat') is distinct from 'number' or jsonb_typeof(p->'lon') is distinct from 'number' or (p->>'lat')::numeric not between -90 and 90 or (p->>'lon')::numeric not between -180 and 180) then raise exception 'Coordonnées du tracé invalides'; end if;
  end if;
  for item in select value from jsonb_array_elements(p_members) loop
    member_id := (item->>'user_id')::uuid;
    if member_id<>uid and not exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester=uid and f.addressee=member_id) or (f.addressee=uid and f.requester=member_id))) then raise exception 'Cette personne ne fait pas partie de vos amis'; end if;
  end loop;
  perform set_config('piste.people_creation','on',true);
  insert into public.coaching_sessions(owner_id,route_id,name,status,workflow_version,visibility_version,blind_mode,visibility_mode,laying_mode,planned_route,planned_markers,odor_model,departure_point,invite_code,expires_at)
  values(uid,route.id,'Coaching · '||to_char(now(),'DD/MM/YYYY'),'waiting',2,3,p_blind_mode,'all','traceur',coalesce(route.route,'[]'::jsonb),coalesce(route.waypoints,'[]'::jsonb),coalesce(route.odor_model,'{}'::jsonb),case when without_route then '{}'::jsonb else jsonb_build_object('lat',route.route->0->'lat','lon',route.route->0->'lon') end,upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),now()+interval '7 days') returning id into sid;
  for item in select value from jsonb_array_elements(p_members) loop
    member_id := (item->>'user_id')::uuid;
    member_role := item->>'role';
    insert into public.coaching_members(session_id,user_id,role,invitation_status) values(sid,member_id,member_role,case when member_id=uid then 'accepted' else 'invited' end);
  end loop;
  insert into private.coaching_deferred_v1045(session_id) values(sid);
  perform set_config('piste.people_creation','off',true);
  return jsonb_build_object('id',sid,'session_mode',case when solo_mode then 'solo' else 'standard' end);
end $$;
revoke all on function public.create_coaching_people_session_v1045(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v1045(uuid,jsonb,text) to authenticated;

create or replace function private.join_coaching_session(
  p_invite_code text,
  p_role text default 'coach'
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid;
  v_user uuid := (select auth.uid());
  v_code text := upper(trim(coalesce(p_invite_code, '')));
  v_workflow integer;
  v_has_driver boolean;
begin
  if v_user is null then raise exception 'Authentification requise'; end if;
  if char_length(v_code) < 4 or char_length(v_code) > 32 then raise exception 'Code invalide ou expiré'; end if;
  if p_role not in ('coach','traceur','observer','driver') then raise exception 'Rôle invalide'; end if;
  select s.id,s.workflow_version,exists(select 1 from public.coaching_members m where m.session_id=s.id and m.role='driver')
    into v_id,v_workflow,v_has_driver
    from public.coaching_sessions s
   where upper(s.invite_code)=v_code
     and s.status in ('waiting','live')
     and (s.expires_at is null or s.expires_at>now())
   limit 1;
  if v_id is null then raise exception 'Code invalide ou expiré'; end if;
  if p_role='driver' and (coalesce(v_workflow,1)<2 or v_has_driver) then raise exception 'Le rôle Conducteur n’est pas disponible pour cette session'; end if;
  insert into public.coaching_members(session_id,user_id,role)
  values(v_id,v_user,p_role)
  on conflict(session_id,user_id) do nothing;
  return v_id;
end $$;
revoke all on function private.join_coaching_session(text,text) from public,anon,authenticated;
grant execute on function private.join_coaching_session(text,text) to authenticated;

create or replace function public.join_coaching_session(p_invite_code text,p_role text default 'coach')
returns uuid language sql security invoker set search_path='' as $$ select private.join_coaching_session(p_invite_code,p_role) $$;
revoke all on function public.join_coaching_session(text,text) from public,anon;
grant execute on function public.join_coaching_session(text,text) to authenticated;
commit;
