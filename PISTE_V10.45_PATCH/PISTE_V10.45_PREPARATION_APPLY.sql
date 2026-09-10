begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Incremental preparation regression fix. No table, policy, trigger or existing row changes.
do $audit$
declare obj oid:=to_regprocedure('public.create_coaching_people_session_v1045(uuid,jsonb,text)');
begin
 if obj is null or to_regprocedure('public.create_coaching_people_session_v1045(uuid,jsonb,text,text)') is not null then raise exception 'Appliquer le correctif incrémental V10.45 précédent avant celui-ci'; end if;
 if not exists(select 1 from pg_catalog.pg_proc where oid=obj and md5(prosrc) in ('882f7f345ec407e5571b2d4cb013bd1b','be7ef7fe4d21d6f108afccdc2c52f437') and prosecdef and 'search_path=""'=any(proconfig)) then raise exception 'RPC de création différente de la version auditée'; end if;
 if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.coaching_sessions'::regclass and tgname='coaching_people_guard_v10423' and tgenabled in ('O','A')) then raise exception 'Protection V10.42.3 absente'; end if;
 raise notice 'Audit OK : rétablissement de la préparation Normal/Simple aveugle uniquement.';
end $audit$;

create or replace function public.create_coaching_people_session_v1045(p_route_id uuid,p_members jsonb,p_blind_mode text default 'normal')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); route public.training_routes; sid uuid; item jsonb; member_id uuid; member_role text; without_route boolean;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 if p_blind_mode is null or p_blind_mode not in ('normal','simple_blind','full_blind') then raise exception 'Mode de visibilité invalide'; end if;
 if jsonb_typeof(p_members) is distinct from 'array' then raise exception 'Liste de personnes requise'; end if;
 if exists(select 1 from jsonb_array_elements(p_members) m where m->>'user_id' is null or coalesce(m->>'role','') not in ('coach','traceur','driver','observer')) then raise exception 'Rôle ou personne invalide'; end if;
 if (select count(*) from jsonb_array_elements(p_members))<>(select count(distinct (m->>'user_id')::uuid) from jsonb_array_elements(p_members) m) then raise exception 'Chaque personne doit apparaître une seule fois'; end if;
 if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='driver')<>1 or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
 if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1 then raise exception 'Choisissez au maximum un Coach'; end if;
 if not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','traceur','driver')) then raise exception 'Choisissez votre propre rôle'; end if;
 without_route:=p_blind_mode='full_blind' and exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver'));
 if without_route then
  if p_route_id is not null then raise exception 'Le Traceur distinct pose la piste : aucun tracé du Coach ou du Conducteur'; end if;
 else
  select * into route from public.training_routes where id=p_route_id and owner_id=uid;
  if route.id is null or jsonb_array_length(route.route)<2 then raise exception 'Tracé préparé personnel requis'; end if;
  if exists(select 1 from jsonb_array_elements(route.route) p where jsonb_typeof(p->'lat') is distinct from 'number' or jsonb_typeof(p->'lon') is distinct from 'number' or (p->>'lat')::numeric not between -90 and 90 or (p->>'lon')::numeric not between -180 and 180) then raise exception 'Coordonnées du tracé invalides'; end if;
 end if;
 for item in select value from jsonb_array_elements(p_members) loop
  member_id:=(item->>'user_id')::uuid;
  if member_id<>uid and not exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester=uid and f.addressee=member_id) or (f.addressee=uid and f.requester=member_id))) then raise exception 'Cette personne ne fait pas partie de vos amis'; end if;
 end loop;
 perform set_config('piste.people_creation','on',true);
 insert into public.coaching_sessions(owner_id,route_id,name,status,workflow_version,visibility_version,blind_mode,visibility_mode,laying_mode,planned_route,planned_markers,odor_model,departure_point,invite_code,expires_at)
 values(uid,route.id,'Coaching · '||to_char(now(),'DD/MM/YYYY'),'waiting',2,3,p_blind_mode,'all','traceur',coalesce(route.route,'[]'::jsonb),coalesce(route.waypoints,'[]'::jsonb),coalesce(route.odor_model,'{}'::jsonb),case when without_route then '{}'::jsonb else jsonb_build_object('lat',route.route->0->'lat','lon',route.route->0->'lon') end,upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),now()+interval '7 days') returning id into sid;
 for item in select value from jsonb_array_elements(p_members) loop
  member_id:=(item->>'user_id')::uuid;member_role:=item->>'role';
  insert into public.coaching_members(session_id,user_id,role,invitation_status) values(sid,member_id,member_role,case when member_id=uid then 'accepted' else 'invited' end);
 end loop;
 insert into private.coaching_deferred_v1045(session_id) values(sid);
 perform set_config('piste.people_creation','off',true);
 return jsonb_build_object('id',sid);
end $$;
revoke all on function public.create_coaching_people_session_v1045(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v1045(uuid,jsonb,text) to authenticated;
notify pgrst, 'reload schema';

commit;
