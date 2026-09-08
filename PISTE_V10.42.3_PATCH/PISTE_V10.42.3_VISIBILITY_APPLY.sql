-- V10.42.3 personnes/rôles : MANUEL UNIQUEMENT. Aucun SQL exécuté par l'application.
-- Prérequis : V10.42.2 audit sécurité et track-ready ; capabilities facultatif.
begin;
select schemaname,tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename like 'coaching_%' order by tablename,policyname;
select routine_schema,routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_name like '%coaching%' order by routine_schema,routine_name;
do $$ declare n text; begin
 foreach n in array array['private.can_read_coaching_live_point_v1042(uuid,uuid)','private.can_read_coaching_trace_point_v1042(uuid,uuid)','private.can_read_coaching_marker_v1042(uuid,uuid)','public.get_my_coaching_sessions(uuid)','public.start_coaching_laying(uuid)','public.mark_coaching_track_ready(uuid)','public.start_driver_run(uuid)','public.finish_driver_run(uuid)','private.guard_coaching_debrief_contributions_v1042()'] loop
  if to_regprocedure(n) is null then raise exception 'Prérequis absent : %',n; end if;
 end loop;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('coaching_sessions','coaching_members','coaching_trace_points','coaching_live_points','coaching_markers','coaching_debriefs') and not c.relrowsecurity) then raise exception 'RLS obligatoire'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename in ('coaching_trace_points','coaching_live_points','coaching_markers') and cmd in ('SELECT','ALL') and policyname not in ('coaching_v1042_trace_select','coaching_v1042_live_select','coaching_v1042_markers_select','coaching_visibility_v10423')) then raise exception 'Policy SELECT/ALL inconnue : audit manuel requis'; end if;
end $$;
do $$ begin
 if exists(select 1 from public.coaching_members where role not in ('driver','traceur','coach','observer','solo')) then raise exception 'Rôle historique inconnu : normalisation manuelle requise'; end if;
 if exists(select 1 from public.coaching_members group by session_id,user_id having count(*)>1) then raise exception 'Memberships dupliqués'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='coaching_sessions' and cmd in ('SELECT','ALL') and coalesce(qual,'') in ('true','(true)')) then raise exception 'Sessions globalement lisibles'; end if;
end $$;
-- NULL distingue toutes les anciennes sessions ; aucun backfill work_mode/capabilities.
alter table public.coaching_sessions add column if not exists visibility_version integer;
comment on column public.coaching_sessions.visibility_version is '3 = création atomique personnes/rôles ; NULL = visibilité historique conservée';
-- Sauvegarde exacte des fonctions déployées, une seule fois, hors API publique.
do $$ declare sig text; f regprocedure; def text; name text; dest text; begin
 foreach sig in array array['private.can_read_coaching_live_point_v1042(uuid,uuid)','private.can_read_coaching_trace_point_v1042(uuid,uuid)','private.can_read_coaching_marker_v1042(uuid,uuid)','public.get_my_coaching_sessions(uuid)','public.start_coaching_laying(uuid)','public.mark_coaching_track_ready(uuid)','public.start_driver_run(uuid)','public.finish_driver_run(uuid)','public.finish_coaching_laying(uuid)','public.set_coaching_ready(uuid)'] loop
  f:=to_regprocedure(sig); if f is null then raise exception 'RPC manquante : %',sig; end if;
  select proname into name from pg_proc where oid=f;
  dest:='private.legacy_'||name||'_v10423';
  if to_regprocedure(dest||substring(sig from '\(.*$')) is null then
   def:=pg_get_functiondef(f);
   def:=replace(def,split_part(sig,'(',1)||'(',dest||'(');
   execute def;
  end if;
  execute 'revoke all on function '||dest||substring(sig from '\(.*$')||' from public,anon,authenticated';
 end loop;
end $$;
create or replace function private.coaching_truth_v10423(p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select m.invitation_status in ('accepted','active') and
  (s.status='ended' or s.phase='completed' or s.blind_mode='normal' or m.role='traceur' or (s.blind_mode='simple_blind' and m.role in ('coach','observer')))
 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false)
$$;
revoke all on function private.coaching_truth_v10423(uuid) from public,anon,authenticated;

create or replace function private.can_read_coaching_live_point_v1042(p_session_id uuid,p_owner_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r public.coaching_sessions; me public.coaching_members; uid uuid:=(select auth.uid()); subject_role text;
begin
 if uid is null then return false; end if;
 select * into r from public.coaching_sessions where id=p_session_id;
 if not found then return false; end if;
 if r.visibility_version is distinct from 3 then return private.legacy_can_read_coaching_live_point_v1042_v10423(p_session_id,p_owner_id); end if;
 select * into me from public.coaching_members where session_id=p_session_id and user_id=uid;
 if me.user_id is null or me.invitation_status not in ('accepted','active') then return false; end if;
 select role into subject_role from public.coaching_members where session_id=p_session_id and user_id=p_owner_id;
 return coalesce((private.coaching_truth_v10423(p_session_id) or p_owner_id=uid or (r.blind_mode='full_blind' and me.role in ('coach','observer') and subject_role in ('driver','coach'))),false);
end $$;
revoke all on function private.can_read_coaching_live_point_v1042(uuid,uuid) from public,anon;
grant execute on function private.can_read_coaching_live_point_v1042(uuid,uuid) to authenticated;

create or replace function private.can_read_coaching_trace_point_v1042(p_session_id uuid,p_owner_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r public.coaching_sessions; me public.coaching_members; uid uuid:=(select auth.uid()); subject_role text;
begin
 if uid is null then return false; end if;
 select * into r from public.coaching_sessions where id=p_session_id;
 if not found then return false; end if;
 if r.visibility_version is distinct from 3 then return private.legacy_can_read_coaching_trace_point_v1042_v10423(p_session_id,p_owner_id); end if;
 select * into me from public.coaching_members where session_id=p_session_id and user_id=uid;
 if me.user_id is null or me.invitation_status not in ('accepted','active') then return false; end if;
 select role into subject_role from public.coaching_members where session_id=p_session_id and user_id=p_owner_id;
 return coalesce(private.coaching_truth_v10423(p_session_id),false);
end $$;
revoke all on function private.can_read_coaching_trace_point_v1042(uuid,uuid) from public,anon;
grant execute on function private.can_read_coaching_trace_point_v1042(uuid,uuid) to authenticated;

create or replace function private.can_read_coaching_marker_v1042(p_session_id uuid,p_author_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r public.coaching_sessions; me public.coaching_members; uid uuid:=(select auth.uid()); subject_role text;
begin
 if uid is null then return false; end if;
 select * into r from public.coaching_sessions where id=p_session_id;
 if not found then return false; end if;
 if r.visibility_version is distinct from 3 then return private.legacy_can_read_coaching_marker_v1042_v10423(p_session_id,p_author_id); end if;
 select * into me from public.coaching_members where session_id=p_session_id and user_id=uid;
 if me.user_id is null or me.invitation_status not in ('accepted','active') then return false; end if;
 select role into subject_role from public.coaching_members where session_id=p_session_id and user_id=p_author_id;
 return coalesce(private.coaching_truth_v10423(p_session_id),false);
end $$;
revoke all on function private.can_read_coaching_marker_v1042(uuid,uuid) from public,anon;
grant execute on function private.can_read_coaching_marker_v1042(uuid,uuid) to authenticated;

-- Projection explicite : aucun nouveau champ de session n'est exposé implicitement.
create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(case when s.visibility_version is distinct from 3 then legacy.row else
 jsonb_build_object('id',s.id,'owner_id',s.owner_id,'name',s.name,'status',s.status,'workflow_version',s.workflow_version,'visibility_version',3,
 'phase',s.phase,'blind_mode',s.blind_mode,'visibility_mode',s.visibility_mode,'laying_mode',s.laying_mode,
 'created_at',s.created_at,'started_at',s.started_at,'ended_at',s.ended_at,'laying_started_at',s.laying_started_at,'track_finished_at',s.track_finished_at,'driver_started_at',s.driver_started_at,'driver_finished_at',s.driver_finished_at,
 'invite_code',case when s.owner_id=(select auth.uid()) then s.invite_code else null end,
 'departure_point',case when me.invitation_status in ('accepted','active') then jsonb_build_object('lat',s.planned_route->0->'lat','lon',s.planned_route->0->'lon') else '{}'::jsonb end,
 'planned_route',case when private.coaching_truth_v10423(s.id) then s.planned_route else '[]'::jsonb end,
 'planned_markers',case when private.coaching_truth_v10423(s.id) then s.planned_markers else '[]'::jsonb end,
 'odor_model',case when private.coaching_truth_v10423(s.id) then s.odor_model else '{}'::jsonb end,
 'coaching_members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',(select p.display_name from public.profiles p where p.user_id=m.user_id),'role',m.role,'invitation_status',m.invitation_status,'ready_at',m.ready_at)),'[]'::jsonb) from public.coaching_members m where m.session_id=s.id)) end order by s.created_at desc),'[]'::jsonb)
 from public.coaching_sessions s join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
 left join lateral (select row from jsonb_array_elements(private.legacy_get_my_coaching_sessions_v10423(s.id)) row where s.visibility_version is distinct from 3) legacy on true
 where (p_session_id is null or s.id=p_session_id) and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;
-- Retirer aussi les chemins indirects (route_id, scénario/photo/destination).
revoke select on public.coaching_sessions from public,anon,authenticated;
do $$ declare c record; begin
 for c in select attname from pg_attribute where attrelid='public.coaching_sessions'::regclass and attnum>0 and not attisdropped loop
  execute format('revoke select (%I) on public.coaching_sessions from public,anon,authenticated',c.attname);
 end loop;
end $$;
grant select (id,owner_id,name,status,workflow_version,visibility_version,phase,blind_mode,visibility_mode,laying_mode,created_at,started_at,ended_at,laying_started_at,track_finished_at,coach_ready_at,driver_started_at,driver_finished_at,updated_at,invite_code) on public.coaching_sessions to authenticated;

create or replace function public.create_coaching_people_session(p_route_id uuid,p_members jsonb,p_blind_mode text default 'normal')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); route public.training_routes; sid uuid; item jsonb; member_id uuid; member_role text;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 if p_blind_mode is null or p_blind_mode not in ('normal','simple_blind','full_blind') then raise exception 'Mode de visibilité invalide'; end if;
 if jsonb_typeof(p_members) is distinct from 'array' then raise exception 'Liste de personnes requise'; end if;
 if exists(select 1 from jsonb_array_elements(p_members) m where m->>'user_id' is null or coalesce(m->>'role','') not in ('coach','traceur','driver','observer')) then raise exception 'Rôle ou personne invalide'; end if;
 if (select count(*) from jsonb_array_elements(p_members))<>(select count(distinct (m->>'user_id')::uuid) from jsonb_array_elements(p_members) m) then raise exception 'Chaque personne doit apparaître une seule fois'; end if;
 if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='driver')<>1 or (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
 if (select count(*) from jsonb_array_elements(p_members) m where m->>'role'='coach')>1 then raise exception 'Choisissez au maximum un Coach'; end if;
 if not exists(select 1 from jsonb_array_elements(p_members) m where (m->>'user_id')::uuid=uid and m->>'role' in ('coach','traceur','driver')) then raise exception 'Choisissez votre propre rôle'; end if;
 select * into route from public.training_routes where id=p_route_id and owner_id=uid;
 if route.id is null or jsonb_array_length(route.route)<2 then raise exception 'Tracé préparé personnel requis'; end if;
 if exists(select 1 from jsonb_array_elements(route.route) p where jsonb_typeof(p->'lat') is distinct from 'number' or jsonb_typeof(p->'lon') is distinct from 'number' or (p->>'lat')::numeric not between -90 and 90 or (p->>'lon')::numeric not between -180 and 180) then raise exception 'Coordonnées du tracé invalides'; end if;
 for item in select value from jsonb_array_elements(p_members) loop
  member_id:=(item->>'user_id')::uuid;
  if member_id<>uid and not exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester=uid and f.addressee=member_id) or (f.addressee=uid and f.requester=member_id))) then raise exception 'Cette personne ne fait pas partie de vos amis'; end if;
 end loop;
 perform set_config('piste.people_creation','on',true);
 insert into public.coaching_sessions(owner_id,route_id,name,status,workflow_version,visibility_version,blind_mode,visibility_mode,laying_mode,planned_route,planned_markers,odor_model,departure_point,invite_code,expires_at)
 values(uid,route.id,'Coaching · '||to_char(now(),'DD/MM/YYYY'),'waiting',2,3,p_blind_mode,'all','traceur',route.route,coalesce(route.waypoints,'[]'::jsonb),coalesce(route.odor_model,'{}'::jsonb),jsonb_build_object('lat',route.route->0->'lat','lon',route.route->0->'lon'),upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),now()+interval '7 days') returning id into sid;
 for item in select value from jsonb_array_elements(p_members) loop
  member_id:=(item->>'user_id')::uuid;member_role:=item->>'role';
  insert into public.coaching_members(session_id,user_id,role,invitation_status) values(sid,member_id,member_role,case when member_id=uid then 'accepted' else 'invited' end);
 end loop;
 perform set_config('piste.people_creation','off',true);
 return jsonb_build_object('id',sid);
end $$;
revoke all on function public.create_coaching_people_session(uuid,jsonb,text) from public,anon;
grant execute on function public.create_coaching_people_session(uuid,jsonb,text) to authenticated;

-- La version, les trois couches et la matrice ne peuvent pas changer par UPDATE client.
create or replace function private.guard_people_session_v10423()
returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if tg_op='INSERT' then
  if coalesce(new.workflow_version,1)>=2 and new.visibility_version is distinct from 3 then raise exception 'Utilisez la création Coaching par personnes'; end if;
  if new.visibility_version is not null and (new.visibility_version<>3 or coalesce(current_setting('piste.people_creation',true),'off')<>'on') then raise exception 'Utilisez la création Coaching sécurisée'; end if;
 else
  if new.visibility_version is distinct from old.visibility_version then raise exception 'Version de visibilité immuable'; end if;
  if old.visibility_version=3 and (new.owner_id is distinct from old.owner_id or new.blind_mode is distinct from old.blind_mode or new.route_id is distinct from old.route_id or new.planned_route is distinct from old.planned_route or new.planned_markers is distinct from old.planned_markers or new.odor_model is distinct from old.odor_model or new.departure_point is distinct from old.departure_point or new.laying_mode is distinct from old.laying_mode) then raise exception 'Préparation et visibilité immuables'; end if;
  if old.visibility_version=3 and coalesce(current_setting('piste.v1040_transition',true),'off')<>'on' and (new.phase is distinct from old.phase or new.laying_started_at is distinct from old.laying_started_at or new.track_finished_at is distinct from old.track_finished_at or new.driver_started_at is distinct from old.driver_started_at or new.driver_finished_at is distinct from old.driver_finished_at or (new.status is distinct from old.status and new.status<>'cancelled')) then raise exception 'Utilisez les transitions sécurisées'; end if;
 end if;return new;
end $$;
revoke all on function private.guard_people_session_v10423() from public,anon,authenticated;
drop trigger if exists coaching_people_guard_v10423 on public.coaching_sessions;
create trigger coaching_people_guard_v10423 before insert or update on public.coaching_sessions for each row execute function private.guard_people_session_v10423();
create or replace function private.guard_people_member_v10423()
returns trigger language plpgsql security definer set search_path='' as $$ declare sid uuid; version integer; begin
 sid:=case when tg_op='DELETE' then old.session_id else new.session_id end;
 select visibility_version into version from public.coaching_sessions where id=sid;
 if version=3 then
  if tg_op='INSERT' and coalesce(current_setting('piste.people_creation',true),'off')<>'on' then raise exception 'Participants fixés à la création'; end if;
  if tg_op='UPDATE' and (new.role is distinct from old.role or new.user_id is distinct from old.user_id or new.session_id is distinct from old.session_id) then raise exception 'Identité et rôle immuables'; end if;
  if tg_op='DELETE' and old.role<>'observer' and pg_trigger_depth()=1 then raise exception 'Un participant terrain ne peut quitter cette session ; annulez-la si nécessaire'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;return new;
end $$;
revoke all on function private.guard_people_member_v10423() from public,anon,authenticated;
drop trigger if exists coaching_people_member_guard_v10423 on public.coaching_members;
create trigger coaching_people_member_guard_v10423 before insert or update or delete on public.coaching_members for each row execute function private.guard_people_member_v10423();

create or replace function public.start_coaching_laying(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 select * into r from public.coaching_sessions where id=p_session_id for update;
 if r.id is null then raise exception 'Session introuvable'; end if;
 if r.visibility_version is distinct from 3 then
  r:=private.legacy_start_coaching_laying_v10423(p_session_id);
 else
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name is distinct from 'traceur' then raise exception 'Action réservée au traceur'; end if;
  if r.phase='laying' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
  if r.phase<>'preparation' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
  if (select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='laying',status='live',laying_started_at=coalesce(laying_started_at,now()) where id=r.id returning * into r;
 end if;
 -- Même le résultat de transition passe par la projection aveugle.
 return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.start_coaching_laying(uuid) from public,anon;
grant execute on function public.start_coaching_laying(uuid) to authenticated;

create or replace function public.mark_coaching_track_ready(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 select * into r from public.coaching_sessions where id=p_session_id for update;
 if r.id is null then raise exception 'Session introuvable'; end if;
 if r.visibility_version is distinct from 3 then
  r:=private.legacy_mark_coaching_track_ready_v10423(p_session_id);
 else
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name is distinct from 'traceur' then raise exception 'Action réservée au traceur'; end if;
  if r.phase='waiting_ready' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
  if r.phase<>'laying' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
  if (select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='waiting_ready',status='waiting',track_finished_at=coalesce(track_finished_at,now()) where id=r.id returning * into r;
 end if;
 -- Même le résultat de transition passe par la projection aveugle.
 return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.mark_coaching_track_ready(uuid) from public,anon;
grant execute on function public.mark_coaching_track_ready(uuid) to authenticated;

create or replace function public.start_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 select * into r from public.coaching_sessions where id=p_session_id for update;
 if r.id is null then raise exception 'Session introuvable'; end if;
 if r.visibility_version is distinct from 3 then
  r:=private.legacy_start_driver_run_v10423(p_session_id);
 else
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name is distinct from 'driver' then raise exception 'Action réservée au driver'; end if;
  if r.phase='driver_running' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
  if r.phase<>'waiting_ready' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
  if (select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='driver_running',status='live',driver_started_at=coalesce(driver_started_at,now()) where id=r.id returning * into r;
 end if;
 -- Même le résultat de transition passe par la projection aveugle.
 return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.start_driver_run(uuid) from public,anon;
grant execute on function public.start_driver_run(uuid) to authenticated;

create or replace function public.finish_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text;
begin
 if uid is null then raise exception 'Authentification requise'; end if;
 select * into r from public.coaching_sessions where id=p_session_id for update;
 if r.id is null then raise exception 'Session introuvable'; end if;
 if r.visibility_version is distinct from 3 then
  r:=private.legacy_finish_driver_run_v10423(p_session_id);
 else
  select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if role_name is distinct from 'driver' then raise exception 'Action réservée au driver'; end if;
  if r.phase='completed' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
  if r.phase<>'driver_running' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
  if (select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1 then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set phase='completed',status='live',driver_finished_at=coalesce(driver_finished_at,now()) where id=r.id returning * into r;
 end if;
 -- Même le résultat de transition passe par la projection aveugle.
 return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.finish_driver_run(uuid) from public,anon;
grant execute on function public.finish_driver_run(uuid) to authenticated;

create or replace function public.finish_coaching_laying(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$ declare r public.coaching_sessions; begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 select * into r from public.coaching_sessions where id=p_session_id;
 if r.visibility_version=3 then raise exception 'Utilisez le workflow Traceur puis Conducteur'; end if;
 r:=private.legacy_finish_coaching_laying_v10423(p_session_id);
 return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.finish_coaching_laying(uuid) from public,anon;
grant execute on function public.finish_coaching_laying(uuid) to authenticated;

create or replace function public.set_coaching_ready(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$ declare r public.coaching_sessions; begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 select * into r from public.coaching_sessions where id=p_session_id;
 if r.visibility_version=3 then raise exception 'Utilisez le workflow Traceur puis Conducteur'; end if;
 r:=private.legacy_set_coaching_ready_v10423(p_session_id);
 return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.set_coaching_ready(uuid) from public,anon;
grant execute on function public.set_coaching_ready(uuid) to authenticated;

create or replace function private.can_record_people_point_v10423(p_session_id uuid,p_owner_id uuid,p_trace boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select s.visibility_version is distinct from 3 or
 (m.user_id=(select auth.uid()) and p_owner_id=m.user_id and m.invitation_status in ('accepted','active') and s.status='live' and
 ((p_trace and m.role='traceur' and s.phase='laying') or (not p_trace and m.role='driver' and s.phase='driver_running')))
 from public.coaching_sessions s left join public.coaching_members m on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false)
$$;
revoke all on function private.can_record_people_point_v10423(uuid,uuid,boolean) from public,anon;
grant execute on function private.can_record_people_point_v10423(uuid,uuid,boolean) to authenticated;

drop policy if exists coaching_record_v10423 on public.coaching_trace_points;
create policy coaching_record_v10423 on public.coaching_trace_points as restrictive for insert to authenticated with check (private.can_record_people_point_v10423(session_id,owner_id,true));

drop policy if exists coaching_record_v10423 on public.coaching_live_points;
create policy coaching_record_v10423 on public.coaching_live_points as restrictive for insert to authenticated with check (private.can_record_people_point_v10423(session_id,owner_id,false));

create or replace function private.guard_coaching_debrief_contributions_v1042()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  session_phase text;
  session_status text;
  session_owner uuid;
  workflow_version integer;
  invitation_name text;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select s.owner_id,coalesce(s.workflow_version,1),s.phase,s.status
    into session_owner,workflow_version,session_phase,session_status
  from public.coaching_sessions s where s.id=new.session_id;
  if not found then raise exception 'Session Coaching introuvable'; end if;
  if new.owner_id is distinct from session_owner then raise exception 'owner_id invalide'; end if;
  -- Branche legacy : les policies historiques restent seules responsables des contributions.
  if workflow_version<2 then return new; end if;
  select m.role,m.invitation_status into role_name,invitation_name
  from public.coaching_members m where m.session_id=new.session_id and m.user_id=uid;
  if role_name is null or invitation_name not in ('accepted','active') then raise exception 'Participation Coaching active requise'; end if;
  if session_status<>'ended' and session_phase<>'completed' then
    raise exception 'Débrief disponible après le parcours';
  end if;
  if role_name='driver' then
    if tg_op='UPDATE' then new.last_editor_id:=old.last_editor_id; new.updated_at:=statement_timestamp(); end if;
    if tg_op='INSERT' and
      (new.coach_id is not null or new.strengths is not null or new.improvement_area is not null
       or new.coach_notes is not null or new.statistics_notes is not null
       or new.actual_track<>'[]'::jsonb or new.auto_metrics<>'{}'::jsonb
       or new.publication_status<>'draft' or new.published_at is not null or new.revision<>1)
    then raise exception 'Le Conducteur ne peut écrire que son retour'; end if;
    if tg_op='UPDATE' and
      (new.session_id is distinct from old.session_id or new.owner_id is distinct from old.owner_id
       or new.coach_id is distinct from old.coach_id or new.strengths is distinct from old.strengths
       or new.improvement_area is distinct from old.improvement_area
       or new.coach_notes is distinct from old.coach_notes
       or new.statistics_notes is distinct from old.statistics_notes
       or new.actual_track is distinct from old.actual_track
       or new.auto_metrics is distinct from old.auto_metrics
       or new.publication_status is distinct from old.publication_status
       or new.published_at is distinct from old.published_at
       or new.last_editor_id is distinct from old.last_editor_id
       or new.revision is distinct from old.revision or new.created_at is distinct from old.created_at)
    then raise exception 'Analyse du Coach et métadonnées protégées'; end if;
    -- Valeurs contrôlées par le serveur ; le Conducteur ne choisit aucune métadonnée.
    if tg_op='INSERT' then new.last_editor_id:=null; new.created_at:=statement_timestamp(); end if;
    new.updated_at:=statement_timestamp();
  elsif role_name in ('coach','solo') or uid=session_owner then
    if tg_op='UPDATE' and (new.session_id is distinct from old.session_id or new.owner_id is distinct from old.owner_id
      or new.created_at is distinct from old.created_at or new.revision is distinct from old.revision)
    then raise exception 'Métadonnées structurelles du débrief immuables'; end if;
    if tg_op='INSERT' and new.driver_notes is not null
      then raise exception 'Retour du Conducteur protégé'; end if;
    if tg_op='UPDATE' and new.driver_notes is distinct from old.driver_notes
      then raise exception 'Retour du Conducteur protégé'; end if;
    -- Identités et horodatages sont imposés côté serveur, jamais choisis par le client.
    new.coach_id:=uid;
    new.last_editor_id:=uid;
    if tg_op='INSERT' then new.created_at:=statement_timestamp(); new.revision:=1; end if;
    new.updated_at:=statement_timestamp();
  else
    raise exception 'Rôle non autorisé pour le débrief';
  end if;
  return new;
end $$;

revoke all on function private.guard_coaching_debrief_contributions_v1042() from public,anon,authenticated;
-- L'ancien APPLY capabilities n'est pas requis et ne doit pas être réappliqué après ce patch.
create or replace function private.guard_people_debrief_v10423()
returns trigger language plpgsql security definer set search_path='' as $$ declare r text; v integer; begin
 select visibility_version into v from public.coaching_sessions where id=new.session_id;
 if v=3 then
  select role into r from public.coaching_members where session_id=new.session_id and user_id=(select auth.uid()) and invitation_status in ('accepted','active');
  if r is null or r not in ('coach','driver') then raise exception 'Contribution réservée au Coach ou Conducteur'; end if;
 end if;return new;
end $$;
revoke all on function private.guard_people_debrief_v10423() from public,anon,authenticated;
drop trigger if exists coaching_people_debrief_guard_v10423 on public.coaching_debriefs;
create trigger coaching_people_debrief_guard_v10423 before insert or update on public.coaching_debriefs for each row execute function private.guard_people_debrief_v10423();
-- Position courante uniquement : une ligne écrasée par personne, aucune série GPS.
create table if not exists public.coaching_current_positions (
 session_id uuid not null references public.coaching_sessions(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 lat double precision not null check(lat between -90 and 90),
 lon double precision not null check(lon between -180 and 180),
 accuracy_m double precision not null check(accuracy_m>=0),
 recorded_at timestamptz not null default now(),
 primary key(session_id,owner_id)
);
alter table public.coaching_current_positions enable row level security;
revoke all on public.coaching_current_positions from public,anon,authenticated;
grant select,insert,update on public.coaching_current_positions to authenticated;
create or replace function private.can_share_coaching_position_v10423(p_session_id uuid,p_owner_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select p_owner_id=(select auth.uid()) and s.visibility_version=3 and s.status in ('waiting','live') and s.phase<>'completed' and m.role in ('coach','traceur','driver') and m.invitation_status in ('accepted','active')
 from public.coaching_sessions s join public.coaching_members m on m.session_id=s.id and m.user_id=p_owner_id where s.id=p_session_id),false)
$$;
revoke all on function private.can_share_coaching_position_v10423(uuid,uuid) from public,anon;
grant execute on function private.can_share_coaching_position_v10423(uuid,uuid) to authenticated;
drop policy if exists coaching_position_read on public.coaching_current_positions;
create policy coaching_position_read on public.coaching_current_positions for select to authenticated using(private.can_read_coaching_live_point_v1042(session_id,owner_id));
drop policy if exists coaching_position_insert on public.coaching_current_positions;
create policy coaching_position_insert on public.coaching_current_positions for insert to authenticated with check(private.can_share_coaching_position_v10423(session_id,owner_id));
drop policy if exists coaching_position_update on public.coaching_current_positions;
create policy coaching_position_update on public.coaching_current_positions for update to authenticated using(private.can_share_coaching_position_v10423(session_id,owner_id)) with check(private.can_share_coaching_position_v10423(session_id,owner_id));
create or replace function private.can_annotate_people_v10423(p_session_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select s.visibility_version is distinct from 3 or (m.role in ('coach','driver','traceur') and m.invitation_status in ('accepted','active')) from public.coaching_sessions s left join public.coaching_members m on m.session_id=s.id and m.user_id=(select auth.uid()) where s.id=p_session_id),false)
$$;
revoke all on function private.can_annotate_people_v10423(uuid) from public,anon;
grant execute on function private.can_annotate_people_v10423(uuid) to authenticated;
drop policy if exists coaching_annotation_v10423 on public.coaching_markers;
create policy coaching_annotation_v10423 on public.coaching_markers as restrictive for insert to authenticated with check(private.can_annotate_people_v10423(session_id));

-- Assertions bloquantes avant COMMIT/ROLLBACK.
do $$ declare f record; c text; begin
 if has_table_privilege('authenticated','public.coaching_sessions','SELECT') then raise exception 'SELECT global interdit'; end if;
 foreach c in array array['planned_route','planned_markers','odor_model','route_id','scenario_text','scenario_photo_url','departure_point'] loop
  if has_column_privilege('authenticated','public.coaching_sessions',c,'SELECT') then raise exception 'Colonne révélatrice lisible : %',c; end if;
 end loop;
 if has_function_privilege('anon','public.get_my_coaching_sessions(uuid)','EXECUTE') or has_function_privilege('anon','public.create_coaching_people_session(uuid,jsonb,text)','EXECUTE') then raise exception 'RPC exposée à anon'; end if;
 if not has_function_privilege('authenticated','public.create_coaching_people_session(uuid,jsonb,text)','EXECUTE') then raise exception 'RPC création inaccessible'; end if;
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and (p.proname like '%v10423' or p.proname='coaching_truth_v10423') loop
  if exists(select 1 from aclexplode(coalesce((select proacl from pg_proc where oid=f.oid),acldefault('f',(select proowner from pg_proc where oid=f.oid)))) a where a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'Fonction privée exposée à PUBLIC : %',f.proname; end if;
 end loop;
 if exists(select 1 from public.coaching_sessions s where s.visibility_version=3 and ((select count(*) from public.coaching_members m where m.session_id=s.id and m.role='driver')<>1 or (select count(*) from public.coaching_members m where m.session_id=s.id and m.role='traceur')<>1)) then raise exception 'Matrice de rôles invalide'; end if;
end $$;

commit;
