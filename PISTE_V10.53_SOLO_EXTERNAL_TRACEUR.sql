-- V10.53 — Solo avec tracé enregistré + Traceur externe
-- Migration dédiée, à appliquer uniquement au projet Piste community.
-- Aucun faux membre, aucun faux utilisateur et aucun point GPS externe.
-- Rollback documenté en fin de fichier.

begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

alter table public.coaching_sessions
  add column if not exists traceur_mode text not null default 'connected';

alter table public.coaching_sessions
  drop constraint if exists coaching_sessions_traceur_mode_v1053;
alter table public.coaching_sessions
  add constraint coaching_sessions_traceur_mode_v1053
  check (traceur_mode in ('connected','external'));

-- Le mode est fixé à la création et ne peut pas être changé par une mise à jour client.
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
    ) then
      raise exception 'Préparation, visibilité et mode Traceur immuables';
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

-- New V10.53 creation contract. The V10.45 three-argument function remains intact.
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

create or replace function public.create_coaching_people_session_v105392(
  p_route_id uuid,p_members jsonb,p_blind_mode text,p_traceur_mode text,
  p_scenario_enabled boolean,p_scenario_text text default '',p_photo_paths jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare created jsonb; sid uuid;
begin
  if p_scenario_enabled and jsonb_array_length(coalesce(p_photo_paths,'[]'::jsonb))>0 then
    raise exception 'Les photos doivent être téléversées après la création de la session';
  end if;
  created:=public.create_coaching_people_session_v1053(p_route_id,p_members,p_blind_mode,p_traceur_mode);
  sid:=(created->>'id')::uuid;
  if p_scenario_enabled then perform public.create_coaching_scenario_v10492(sid,coalesce(p_scenario_text,''),coalesce(p_photo_paths,'[]'::jsonb)); end if;
  return created;
end $$;
revoke all on function public.create_coaching_people_session_v105392(uuid,jsonb,text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_coaching_people_session_v105392(uuid,jsonb,text,text,boolean,text,jsonb) to authenticated;

create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(case when s.visibility_version is distinct from 3 then legacy.row else
 jsonb_build_object('id',s.id,'owner_id',s.owner_id,'name',s.name,'status',s.status,'workflow_version',s.workflow_version,
 'visibility_version',3,'traceur_mode',coalesce(s.traceur_mode,'connected'),'server_now',statement_timestamp(),
 'search_mode',case when d.session_id is null then 'immediate' else d.search_mode end,
 'traceur_ready_at',case when me.invitation_status in ('accepted','active') then d.traceur_ready_at else null end,
 'phase',s.phase,'blind_mode',s.blind_mode,'visibility_mode',s.visibility_mode,'laying_mode',s.laying_mode,
 'created_at',s.created_at,'started_at',s.started_at,'ended_at',s.ended_at,'laying_started_at',s.laying_started_at,
 'track_finished_at',s.track_finished_at,'driver_started_at',s.driver_started_at,'driver_finished_at',s.driver_finished_at,
 'invite_code',case when s.owner_id=(select auth.uid()) then s.invite_code else null end,
 'departure_point',case when me.invitation_status in ('accepted','active') then
   case when jsonb_array_length(s.planned_route)>0 then jsonb_build_object('lat',s.planned_route->0->'lat','lon',s.planned_route->0->'lon')
        else coalesce(d.departure_point,'{}'::jsonb) end else '{}'::jsonb end,
 'planned_route',case when private.coaching_truth_v10423(s.id) then s.planned_route else '[]'::jsonb end,
 'planned_markers',case when private.coaching_truth_v10423(s.id) then s.planned_markers else '[]'::jsonb end,
 'odor_model',case when private.coaching_truth_v10423(s.id) then s.odor_model else '{}'::jsonb end,
 'coaching_members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',(select p.display_name from public.profiles p where p.user_id=m.user_id),'role',m.role,'invitation_status',m.invitation_status,'ready_at',m.ready_at)),'[]'::jsonb) from public.coaching_members m where m.session_id=s.id)) end order by s.created_at desc),'[]'::jsonb)
 from public.coaching_sessions s join public.coaching_members me on me.session_id=s.id and me.user_id=(select auth.uid())
 left join private.coaching_deferred_v1045 d on d.session_id=s.id
 left join lateral (select row from jsonb_array_elements(private.legacy_get_my_coaching_sessions_v10423(s.id)) row where s.visibility_version is distinct from 3) legacy on true
 where (p_session_id is null or s.id=p_session_id) and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon,authenticated;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

create or replace function public.mark_external_traceur_ready_v1053(p_session_id uuid,p_search_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); s public.coaching_sessions; m public.coaching_members; d private.coaching_deferred_v1045; ready_at timestamptz:=clock_timestamp();
begin
  if uid is null then raise exception 'Authentification requise' using errcode='42501'; end if;
  if p_search_mode is null or p_search_mode not in ('immediate','deferred') then raise exception 'Type de recherche invalide'; end if;
  select * into s from public.coaching_sessions where id=p_session_id for update;
  if s.id is null then raise exception 'Session introuvable'; end if;
  if s.visibility_version is distinct from 3 or s.traceur_mode<>'external' then raise exception 'Session Traceur externe requise' using errcode='42501'; end if;
  select * into m from public.coaching_members where session_id=s.id and user_id=uid;
  if m.user_id is null or m.invitation_status not in ('accepted','active') or m.role not in ('driver','coach') then raise exception 'Pilote Coaching autorisé requis' using errcode='42501'; end if;
  select * into d from private.coaching_deferred_v1045 where session_id=s.id for update;
  if d.session_id is null then raise exception 'Session V10.45 requise'; end if;
  if d.traceur_ready_at is not null then return public.get_my_coaching_sessions(s.id)->0; end if;
  if s.phase<>'preparation' or s.status not in ('waiting','live') or s.driver_started_at is not null then raise exception 'La session externe n’est pas prête'; end if;
  perform set_config('piste.v1040_transition','on',true);
  update public.coaching_sessions set status='waiting',phase='waiting_ready',track_finished_at=coalesce(track_finished_at,ready_at) where id=s.id;
  update private.coaching_deferred_v1045 set search_mode=p_search_mode,traceur_ready_at=ready_at where session_id=s.id;
  return public.get_my_coaching_sessions(s.id)->0;
end $$;
revoke all on function public.mark_external_traceur_ready_v1053(uuid,text) from public,anon,authenticated;
grant execute on function public.mark_external_traceur_ready_v1053(uuid,text) to authenticated;

create or replace function public.start_driver_run(p_session_id uuid)
returns public.coaching_sessions language plpgsql security definer set search_path='' as $$
declare r public.coaching_sessions; uid uuid:=(select auth.uid()); role_name text; solo_mode boolean:=false; external_mode boolean:=false;
begin
  if uid is null then raise exception 'Authentification requise'; end if;
  select * into r from public.coaching_sessions where id=p_session_id for update;
  if r.id is null then raise exception 'Session introuvable'; end if;
  if r.visibility_version is distinct from 3 then r:=private.legacy_start_driver_run_v10423(p_session_id);
  else
    select m.role into role_name from public.coaching_members m where m.session_id=r.id and m.user_id=uid and m.invitation_status in ('accepted','active');
    solo_mode:=role_name='solo' and (select count(*) from public.coaching_members m where m.session_id=r.id and m.invitation_status in ('accepted','active'))=1;
    external_mode:=coalesce(r.traceur_mode,'connected')='external';
    if role_name is distinct from 'driver' and not solo_mode then raise exception 'Action réservée au driver'; end if;
    if r.phase='driver_running' then return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0); end if;
    if r.phase<>'waiting_ready' or r.status not in ('waiting','live') then raise exception 'Transition terrain invalide'; end if;
    if not solo_mode and not external_mode and ((select count(*) from public.coaching_members where session_id=r.id and role='driver')<>1 or (select count(*) from public.coaching_members where session_id=r.id and role='traceur')<>1) then raise exception 'Choisissez exactement un Conducteur et un Traceur.'; end if;
    perform set_config('piste.v1040_transition','on',true);
    update public.coaching_sessions set phase='driver_running',status='live',driver_started_at=coalesce(driver_started_at,now()) where id=r.id returning * into r;
  end if;
  return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0);
end $$;
revoke all on function public.start_driver_run(uuid) from public,anon,authenticated;
grant execute on function public.start_driver_run(uuid) to authenticated;

-- Rollback (manual, only after explicit approval):
-- drop function public.mark_external_traceur_ready_v1053(uuid,text);
-- drop function public.create_coaching_people_session_v105392(uuid,jsonb,text,text,boolean,text,jsonb);
-- drop function public.create_coaching_people_session_v1053(uuid,jsonb,text,text);
-- restore the previous definitions of get_my_coaching_sessions, start_driver_run and guard_people_session_v10423;
-- alter table public.coaching_sessions drop constraint coaching_sessions_traceur_mode_v1053;
-- alter table public.coaching_sessions drop column traceur_mode;

commit;
