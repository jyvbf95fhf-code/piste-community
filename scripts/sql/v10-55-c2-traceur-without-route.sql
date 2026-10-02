-- V10.55 C2 hotfix — Traceur propriétaire sans route préparée
-- Scope strict : seules les fonctions de création v1053 et v1045 sont remplacées.
-- Aucun wrapper, RLS, table, donnée ou transition n'est modifié ici.
-- Cette migration est destinée à une application contrôlée après revue.

begin;

create or replace function public.create_coaching_people_session_v1053(
  p_route_id uuid,
  p_members jsonb,
  p_blind_mode text,
  p_traceur_mode text default 'connected'
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := (select auth.uid());
  route public.training_routes;
  sid uuid;
  item jsonb;
  member_id uuid;
  member_role text;
  solo_mode boolean := false;
  external_mode boolean := false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  if p_blind_mode is null or p_blind_mode not in ('normal','simple_blind','full_blind') then
    raise exception 'Mode de visibilité invalide';
  end if;
  if coalesce(p_traceur_mode,'connected') not in ('connected','external') then
    raise exception 'Mode Traceur invalide';
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
  solo_mode := exists(select 1 from jsonb_array_elements(p_members) m where m->>'role'='solo');
  if solo_mode then
    if external_mode
       or (select count(*) from jsonb_array_elements(p_members))<>1
       or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='solo')<>1
       or not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role'='solo') then
      raise exception 'Le mode solo exige une seule personne et le mode Traceur connecté';
    end if;
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
  if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1 then
    raise exception 'Choisissez au maximum un Coach';
  end if;

  -- The route is always resolved server-side against the authenticated owner.
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
  elsif not (solo_mode or external_mode or exists(select 1 from jsonb_array_elements(p_members) m
                                                   where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver','traceur'))) then
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
    owner_id,route_id,name,status,workflow_version,visibility_version,blind_mode,visibility_mode,
    laying_mode,traceur_mode,planned_route,planned_markers,odor_model,departure_point,invite_code,expires_at
  ) values(
    uid,route.id,'Coaching · '||to_char(now(),'DD/MM/YYYY'),'waiting',2,3,p_blind_mode,'all',
    'traceur',coalesce(p_traceur_mode,'connected'),coalesce(route.route,'[]'::jsonb),
    coalesce(route.waypoints,'[]'::jsonb),coalesce(route.odor_model,'{}'::jsonb),
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
  return jsonb_build_object('id',sid,'session_mode',case when solo_mode then 'solo' else 'standard' end,'traceur_mode',coalesce(p_traceur_mode,'connected'));
end $$;
revoke all on function public.create_coaching_people_session_v1053(uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v1053(uuid,jsonb,text,text) to authenticated;

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
  without_route := solo_mode or exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver','traceur'));
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

commit;
