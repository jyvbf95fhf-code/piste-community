begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- V10.45: prepared for manual application only. No SQL executed by Codex.
do $$
begin
 if to_regclass('private.coaching_deferred_v1045') is not null then raise exception 'V10.45 déjà présent : auditer avant réapplication'; end if;
 if to_regprocedure('private.coaching_truth_v10423(uuid)') is null or to_regprocedure('public.create_coaching_people_session(uuid,jsonb,text)') is null or to_regprocedure('public.finish_coaching_session(uuid)') is null then raise exception 'Baseline V10.44 incomplète'; end if;
 if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.coaching_sessions'::regclass and tgname='coaching_people_guard_v10423' and tgenabled<>'D') then raise exception 'Protection V10.42.3 absente'; end if;
end $$;

-- Private supplement, no new columns or permissive policies on the existing sessions.
create table private.coaching_deferred_v1045 (
 session_id uuid primary key references public.coaching_sessions(id) on delete cascade,
 search_mode text not null check(search_mode in ('immediate','deferred')),
 traceur_ready_at timestamptz,
 departure_point jsonb not null default '{}'::jsonb check(jsonb_typeof(departure_point)='object')
);
alter table private.coaching_deferred_v1045 enable row level security;
revoke all on table private.coaching_deferred_v1045 from public,anon,authenticated;

create function public.create_coaching_people_session_v1045(p_route_id uuid,p_members jsonb,p_blind_mode text default 'normal',p_search_mode text default 'immediate')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); route public.training_routes; sid uuid; item jsonb; member_id uuid; member_role text; without_route boolean;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 if p_search_mode is null or p_search_mode not in ('immediate','deferred') then raise exception 'Type de recherche invalide'; end if;
 if p_blind_mode is null or p_blind_mode not in ('normal','simple_blind','full_blind') then raise exception 'Mode de visibilité invalide'; end if;
 if jsonb_typeof(p_members) is distinct from 'array' then raise exception 'Liste de personnes requise'; end if;
 if exists(select 1 from jsonb_array_elements(p_members) m where m->>'user_id' is null or coalesce(m->>'role','') not in ('coach','traceur','driver','observer')) then raise exception 'Rôle ou personne invalide'; end if;
 if (select count(*) from jsonb_array_elements(p_members))<>(select count(distinct (m->>'user_id')::uuid) from jsonb_array_elements(p_members) m) then raise exception 'Chaque personne doit apparaître une seule fois'; end if;
 if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='driver')<>1 or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
 if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1 then raise exception 'Choisissez au maximum un Coach'; end if;
 if not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','traceur','driver')) then raise exception 'Choisissez votre propre rôle'; end if;
 without_route:=p_blind_mode='full_blind' and exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','driver'));
 if without_route then
  if p_route_id is not null then raise exception 'Le Traceur distinct pose la piste : aucun tracé du Coach ou du Conducteur en double aveugle'; end if;
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
 insert into private.coaching_deferred_v1045(session_id,search_mode) values(sid,p_search_mode);
 perform set_config('piste.people_creation','off',true);
 return jsonb_build_object('id',sid);
end $$;
revoke all on function public.create_coaching_people_session_v1045(uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v1045(uuid,jsonb,text,text) to authenticated;

-- Exact V10.42.3 truth gates and legacy projection retained. Only logistical metadata added.
create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(case when s.visibility_version is distinct from 3 then legacy.row else
 jsonb_build_object('id',s.id,'owner_id',s.owner_id,'name',s.name,'status',s.status,'workflow_version',s.workflow_version,'visibility_version',3,
 'server_now',statement_timestamp(),'search_mode',coalesce(d.search_mode,'immediate'),'traceur_ready_at',case when me.invitation_status in ('accepted','active') then d.traceur_ready_at else null end,
 'phase',s.phase,'blind_mode',s.blind_mode,'visibility_mode',s.visibility_mode,'laying_mode',s.laying_mode,
 'created_at',s.created_at,'started_at',s.started_at,'ended_at',s.ended_at,'laying_started_at',s.laying_started_at,'track_finished_at',s.track_finished_at,'driver_started_at',s.driver_started_at,'driver_finished_at',s.driver_finished_at,
 'invite_code',case when s.owner_id=(select auth.uid()) then s.invite_code else null end,
 'departure_point',case when me.invitation_status in ('accepted','active') then case when jsonb_array_length(s.planned_route)>0 then jsonb_build_object('lat',s.planned_route->0->'lat','lon',s.planned_route->0->'lon') else coalesce(d.departure_point,'{}'::jsonb) end else '{}'::jsonb end,
 'planned_route',case when private.coaching_truth_v10423(s.id) then s.planned_route else '[]'::jsonb end,
 'planned_markers',case when private.coaching_truth_v10423(s.id) then s.planned_markers else '[]'::jsonb end,
 'odor_model',case when private.coaching_truth_v10423(s.id) then s.odor_model else '{}'::jsonb end,
 'coaching_members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',(select p.display_name from public.profiles p where p.user_id=m.user_id),'role',m.role,'invitation_status',m.invitation_status,'ready_at',m.ready_at)),'[]'::jsonb) from public.coaching_members m where m.session_id=s.id)) end order by s.created_at desc),'[]'::jsonb)
 from public.coaching_sessions s join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
 left join private.coaching_deferred_v1045 d on d.session_id=s.id
 left join lateral (select row from jsonb_array_elements(private.legacy_get_my_coaching_sessions_v10423(s.id)) row where s.visibility_version is distinct from 3) legacy on true
 where (p_session_id is null or s.id=p_session_id) and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

create function public.mark_coaching_traceur_ready_v1045(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); s public.coaching_sessions; d private.coaching_deferred_v1045;
begin
 if uid is null then raise exception 'Authentification requise' using errcode='42501'; end if;
 select * into s from public.coaching_sessions where id=p_session_id for update;
 if s.id is null or s.visibility_version is distinct from 3 or not exists(select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=uid and m.role='traceur' and m.invitation_status in ('accepted','active')) then raise exception 'Action réservée au Traceur autorisé' using errcode='42501'; end if;
 select * into d from private.coaching_deferred_v1045 where session_id=s.id;
 if d.session_id is null or d.search_mode<>'deferred' then raise exception 'Action réservée à une recherche différée'; end if;
 -- One durable event, no repeated message inserts, including retries after the driver has started.
 if d.traceur_ready_at is not null then return public.get_my_coaching_sessions(s.id)->0; end if;
 if s.phase<>'waiting_ready' or s.status<>'waiting' or s.track_finished_at is null or s.driver_started_at is not null then raise exception 'La pose doit être terminée et le parcours non démarré'; end if;
 update private.coaching_deferred_v1045 set traceur_ready_at=clock_timestamp() where session_id=s.id;
 return public.get_my_coaching_sessions(s.id)->0;
end $$;
revoke all on function public.mark_coaching_traceur_ready_v1045(uuid) from public,anon,authenticated;
grant execute on function public.mark_coaching_traceur_ready_v1045(uuid) to authenticated;

-- Additional server guard: existing transition RPCs cannot bypass deferred readiness.
create function private.guard_coaching_deferred_transition_v1045()
returns trigger language plpgsql security definer set search_path='' as $$
declare d private.coaching_deferred_v1045;
begin
 select * into d from private.coaching_deferred_v1045 where session_id=old.id;
 if d.session_id is null then return new; end if;
 -- Timestamp the actual transition after taking the session lock, not transaction start.
 if old.laying_started_at is null and new.phase='laying' and old.phase<>'laying' then new.laying_started_at:=clock_timestamp(); end if;
 if old.track_finished_at is null and new.phase='waiting_ready' and old.phase='laying' then new.track_finished_at:=clock_timestamp(); end if;
 if old.driver_started_at is null and new.phase='driver_running' and old.phase<>'driver_running' then new.driver_started_at:=clock_timestamp(); end if;
 if old.driver_finished_at is null and new.phase='completed' and old.phase='driver_running' then new.driver_finished_at:=clock_timestamp(); end if;
 if old.ended_at is null and new.status='ended' and old.status<>'ended' then new.ended_at:=clock_timestamp(); end if;
 if old.phase='laying' and new.phase='waiting_ready' and jsonb_array_length(old.planned_route)=0 then
  if (select count(*) from (select 1 from public.coaching_trace_points p join public.coaching_members m on m.session_id=p.session_id and m.user_id=p.owner_id and m.role='traceur' where p.session_id=old.id limit 2) points)<2 then raise exception 'Enregistrez au moins deux points réels avant Piste tracée'; end if;
 end if;
 if old.phase is distinct from new.phase and new.phase='driver_running' and d.search_mode='deferred' then
  if d.traceur_ready_at is null or old.track_finished_at is null then raise exception 'Attendez la confirmation Traceur en place'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_coaching_deferred_transition_v1045() from public,anon,authenticated;
create trigger coaching_deferred_transition_v1045 before update on public.coaching_sessions for each row execute function private.guard_coaching_deferred_transition_v1045();

-- Serialize GPS writes with phase transitions; old RLS remains mandatory.
create function private.guard_coaching_deferred_gps_v1045()
returns trigger language plpgsql security definer set search_path='' as $$
declare s public.coaching_sessions; mode text;
begin
 select * into s from public.coaching_sessions where id=new.session_id for update;
 select search_mode into mode from private.coaching_deferred_v1045 where session_id=new.session_id;
 if mode='deferred' then
  if (select auth.uid()) is null or new.owner_id is distinct from (select auth.uid()) then raise exception 'Propriétaire GPS invalide' using errcode='42501'; end if;
  if s.status<>'live' or (tg_table_name='coaching_trace_points' and s.phase<>'laying') or (tg_table_name in ('coaching_live_points','coaching_current_positions') and s.phase<>'driver_running') then raise exception 'GPS arrêté pendant l’attente' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_coaching_deferred_gps_v1045() from public,anon,authenticated;
create trigger coaching_deferred_gps_v1045 before insert or update on public.coaching_trace_points for each row execute function private.guard_coaching_deferred_gps_v1045();
create trigger coaching_deferred_gps_v1045 before insert or update on public.coaching_live_points for each row execute function private.guard_coaching_deferred_gps_v1045();
create trigger coaching_deferred_gps_v1045 before insert or update on public.coaching_current_positions for each row execute function private.guard_coaching_deferred_gps_v1045();

-- Snapshot the FIRST inserted Traceur point, never a moving/final position.
-- Kept private and immutable to clients even if GPS records are later removed.
create function private.capture_coaching_departure_v1045()
returns trigger language plpgsql security definer set search_path='' as $$
declare s public.coaching_sessions;
begin
 if (select auth.uid()) is null or new.owner_id is distinct from (select auth.uid()) then return new; end if;
 select * into s from public.coaching_sessions where id=new.session_id for update;
 if s.visibility_version=3 and s.phase='laying' and jsonb_array_length(s.planned_route)=0 and exists(select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=new.owner_id and m.role='traceur' and m.invitation_status in ('accepted','active')) then
  update private.coaching_deferred_v1045 set departure_point=jsonb_build_object('lat',new.lat,'lon',new.lon) where session_id=s.id and departure_point='{}'::jsonb;
 end if;
 return new;
end $$;
revoke all on function private.capture_coaching_departure_v1045() from public,anon,authenticated;
create trigger coaching_departure_v1045 after insert on public.coaching_trace_points for each row execute function private.capture_coaching_departure_v1045();

-- Only executable when the operator runs this script manually.
do $$
begin
 if has_table_privilege('authenticated','private.coaching_deferred_v1045','SELECT') or has_table_privilege('authenticated','private.coaching_deferred_v1045','UPDATE') or has_table_privilege('anon','private.coaching_deferred_v1045','SELECT') then raise exception 'Métadonnées privées exposées'; end if;
 if not exists(select 1 from pg_class where oid='private.coaching_deferred_v1045'::regclass and relrowsecurity) then raise exception 'RLS manquante'; end if;
end $$;

rollback;
