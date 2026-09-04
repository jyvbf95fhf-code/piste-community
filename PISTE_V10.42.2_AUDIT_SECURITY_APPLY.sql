-- V10.42.2 audit sécurité Coaching — APPLY manuel uniquement.
-- Corrige la divergence blind_mode/visibility_mode et sépare les contributions au débrief.
begin;

-- Inventaires précis conservés dans la transaction. Les policies inconnues ne sont jamais supprimées.
create temporary table v1042_policy_inventory_before on commit drop as
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_catalog.pg_policies where schemaname='public'
and tablename in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs');
create temporary table v1042_table_privileges_before on commit drop as
select grantor,grantee,table_schema,table_name,privilege_type,is_grantable
from information_schema.role_table_grants where table_schema='public'
and table_name in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs');

alter table public.coaching_debriefs
  add column if not exists driver_notes text;

do $$declare n bigint;begin
  select count(*) into n from public.coaching_debriefs where driver_notes is not null and char_length(driver_notes)>2500;
  if n>0 then raise exception 'V10.42.2 annulée : % driver_notes dépassent 2500 caractères',n; end if;
end$$;

alter table public.coaching_debriefs
  drop constraint if exists coaching_debriefs_driver_notes_length;
alter table public.coaching_debriefs
  add constraint coaching_debriefs_driver_notes_length
  check (driver_notes is null or char_length(driver_notes) <= 2500);

do $$declare names text;begin
  select string_agg(column_name,', ' order by ordinal_position) into names
  from information_schema.columns where table_schema='public' and table_name='coaching_debriefs'
    and column_name not in ('session_id','owner_id','coach_id','strengths','improvement_area','coach_notes','driver_notes','statistics_notes','actual_track','auto_metrics','publication_status','published_at','last_editor_id','revision','created_at','updated_at');
  if names is not null then raise exception 'V10.42.2 annulée : colonnes débrief non classées : %',names; end if;
end$$;

create or replace function private.can_read_coaching_live_point_v1042(
  p_session_id uuid,
  p_owner_id uuid
) returns boolean
language plpgsql stable security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  mode_name text;
  phase_name text;
  status_name text;
  workflow_version integer;
  invitation_name text;
begin
  if uid is null then return false; end if;
  select coalesce(s.workflow_version,1),coalesce(s.blind_mode,'normal'),coalesce(s.phase,'preparation'),s.status
    into workflow_version,mode_name,phase_name,status_name from public.coaching_sessions s where s.id=p_session_id;
  if not found then return false; end if;
  select m.role,m.invitation_status into role_name,invitation_name
  from public.coaching_members m
  where m.session_id=p_session_id and m.user_id=uid;
  -- Legacy : coaching_points_read autorisait tout membre, sans matrice blind_mode V2.
  if workflow_version<2 then return role_name is not null; end if;
  if role_name is null or invitation_name not in ('accepted','active') then return false; end if;
  if uid=p_owner_id then return true; end if;
  if status_name='ended' or phase_name='completed' then return true; end if;
  if mode_name='normal' then return true; end if;
  if mode_name='simple_blind' then return role_name='coach'; end if;
  if mode_name='full_blind' then return false; end if;
  return false;
end $$;

create or replace function private.can_read_coaching_trace_point_v1042(
  p_session_id uuid,
  p_owner_id uuid
) returns boolean
language plpgsql stable security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  mode_name text;
  phase_name text;
  status_name text;
  workflow_version integer;
  invitation_name text;
begin
  if uid is null then return false; end if;
  select coalesce(s.workflow_version,1),coalesce(s.blind_mode,'normal'),coalesce(s.phase,'preparation'),s.status
    into workflow_version,mode_name,phase_name,status_name from public.coaching_sessions s where s.id=p_session_id;
  if not found then return false; end if;
  select m.role,m.invitation_status into role_name,invitation_name from public.coaching_members m
  where m.session_id=p_session_id and m.user_id=uid;
  -- Legacy : Coach/Traceur pendant la session, tout membre après status ended.
  if workflow_version<2 then return role_name in ('coach','traceur') or (status_name='ended' and role_name is not null); end if;
  if role_name is null or invitation_name not in ('accepted','active') then return false; end if;
  if uid=p_owner_id then return true; end if;
  if status_name='ended' or phase_name='completed' then return true; end if;
  if mode_name='normal' then return true; end if;
  if mode_name='simple_blind' then return role_name in ('coach','traceur','solo'); end if;
  return false;
end $$;

create or replace function private.can_read_coaching_marker_v1042(
  p_session_id uuid,
  p_author_id uuid
) returns boolean
language plpgsql stable security definer set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  role_name text;
  mode_name text;
  phase_name text;
  status_name text;
  workflow_version integer;
  invitation_name text;
begin
  if uid is null then return false; end if;
  select coalesce(s.workflow_version,1),coalesce(s.blind_mode,'normal'),coalesce(s.phase,'preparation'),s.status
    into workflow_version,mode_name,phase_name,status_name from public.coaching_sessions s where s.id=p_session_id;
  if not found then return false; end if;
  select m.role,m.invitation_status into role_name,invitation_name from public.coaching_members m
  where m.session_id=p_session_id and m.user_id=uid;
  -- Legacy : coaching_markers_read autorisait tout membre.
  if workflow_version<2 then return role_name is not null; end if;
  if role_name is null or invitation_name not in ('accepted','active') then return false; end if;
  if uid=p_author_id then return true; end if;
  if status_name='ended' or phase_name='completed' then return true; end if;
  if mode_name='normal' then return true; end if;
  if mode_name='simple_blind' then return role_name in ('coach','solo'); end if;
  return false;
end $$;

revoke all on function private.can_read_coaching_live_point_v1042(uuid,uuid) from public,anon;
revoke all on function private.can_read_coaching_trace_point_v1042(uuid,uuid) from public,anon;
revoke all on function private.can_read_coaching_marker_v1042(uuid,uuid) from public,anon;
grant execute on function private.can_read_coaching_live_point_v1042(uuid,uuid) to authenticated;
grant execute on function private.can_read_coaching_trace_point_v1042(uuid,uuid) to authenticated;
grant execute on function private.can_read_coaching_marker_v1042(uuid,uuid) to authenticated;

drop policy if exists "coaching_points_read" on public.coaching_live_points;
drop policy if exists coaching_v1040_live_select on public.coaching_live_points;
drop policy if exists coaching_v1042_live_select on public.coaching_live_points;
create policy coaching_v1042_live_select on public.coaching_live_points
for select to authenticated
using (private.can_read_coaching_live_point_v1042(session_id,owner_id));

drop policy if exists "coaching_trace_points_read" on public.coaching_trace_points;
drop policy if exists coaching_v1040_trace_select on public.coaching_trace_points;
drop policy if exists coaching_v1042_trace_select on public.coaching_trace_points;
create policy coaching_v1042_trace_select on public.coaching_trace_points
for select to authenticated
using (private.can_read_coaching_trace_point_v1042(session_id,owner_id));

drop policy if exists "coaching_markers_read" on public.coaching_markers;
drop policy if exists coaching_v1042_markers_select on public.coaching_markers;
create policy coaching_v1042_markers_select on public.coaching_markers
for select to authenticated
using (private.can_read_coaching_marker_v1042(session_id,author_id));

create or replace function public.get_my_coaching_sessions(p_session_id uuid default null)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
    'workflow_version',coalesce(s.workflow_version,1),
    'blind_mode',coalesce(s.blind_mode,'normal'),
    'planned_route',case
      when (coalesce(s.workflow_version,1)<2 and not (s.status<>'ended' and s.visibility_mode='coach' and me.role='driver'))
        or (coalesce(s.workflow_version,1)>=2 and me.invitation_status in ('accepted','active') and (s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and
          (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))))
      then coalesce(to_jsonb(s.planned_route),'[]'::jsonb)
      else '[]'::jsonb end,
    'planned_markers',case
      when (coalesce(s.workflow_version,1)<2 and not (s.status<>'ended' and s.visibility_mode='coach' and me.role='driver'))
        or (coalesce(s.workflow_version,1)>=2 and me.invitation_status in ('accepted','active') and (s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and
          (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))))
      then coalesce(to_jsonb(s.planned_markers),'[]'::jsonb)
      else '[]'::jsonb end,
    'odor_model',case
      when (coalesce(s.workflow_version,1)<2 and not (s.status<>'ended' and s.visibility_mode='coach' and me.role='driver'))
        or (coalesce(s.workflow_version,1)>=2 and me.invitation_status in ('accepted','active') and (s.status='ended'
        or coalesce(s.phase,'preparation')='completed'
        or coalesce(s.blind_mode,'normal')='normal'
        or (s.blind_mode='simple_blind' and me.role in ('coach','traceur'))
        or (s.blind_mode='full_blind' and
          (me.role='traceur' or (me.role='coach' and s.laying_mode='coach')))))
      then coalesce(to_jsonb(s.odor_model),'{}'::jsonb)
      else '{}'::jsonb end,
    'coaching_members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'role',m.role,'user_id',m.user_id,
        'invitation_status',m.invitation_status,'ready_at',m.ready_at))
      from public.coaching_members m where m.session_id=s.id
    ),'[]'::jsonb)
  ) order by s.created_at desc),'[]'::jsonb)
  from public.coaching_sessions s
  join public.coaching_members me
    on me.session_id=s.id and me.user_id=(select auth.uid())
  where (p_session_id is null or s.id=p_session_id)
    and me.invitation_status<>'declined'
$$;
revoke all on function public.get_my_coaching_sessions(uuid) from public,anon;
grant execute on function public.get_my_coaching_sessions(uuid) to authenticated;

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

-- Le trigger historique de révision reste inchangé en legacy ; en V2 un retour Conducteur ne modifie pas revision.
create or replace function private.bump_coaching_debrief_revision()
returns trigger language plpgsql set search_path=''
as $$declare v_workflow integer; v_role text;begin
  select coalesce(s.workflow_version,1) into v_workflow from public.coaching_sessions s where s.id=new.session_id;
  select m.role into v_role from public.coaching_members m where m.session_id=new.session_id and m.user_id=(select auth.uid());
  if v_workflow>=2 and v_role='driver' then new.revision:=old.revision; else new.revision:=old.revision+1; end if;
  new.updated_at:=statement_timestamp();
  return new;
end$$;
revoke all on function private.bump_coaching_debrief_revision() from public,anon,authenticated;

drop trigger if exists coaching_debrief_contributions_guard_v1042
  on public.coaching_debriefs;
create trigger coaching_debrief_contributions_guard_v1042
before insert or update on public.coaching_debriefs
for each row execute function private.guard_coaching_debrief_contributions_v1042();

drop trigger if exists coaching_debrief_revision on public.coaching_debriefs;
create trigger coaching_debrief_revision before update on public.coaching_debriefs
for each row execute function private.bump_coaching_debrief_revision();

-- PostgreSQL déclenche les BEFORE UPDATE du même événement par nom : la garde précède la révision.
do $$declare a text; b text;begin
  select tgname into a from pg_catalog.pg_trigger where tgrelid='public.coaching_debriefs'::regclass and tgname='coaching_debrief_contributions_guard_v1042' and not tgisinternal;
  select tgname into b from pg_catalog.pg_trigger where tgrelid='public.coaching_debriefs'::regclass and tgname='coaching_debrief_revision' and not tgisinternal;
  if a is null or b is null or a>=b then raise exception 'Ordre des triggers débrief invalide : garde puis révision requis'; end if;
  if not exists (select 1 from pg_catalog.pg_trigger where tgrelid='public.coaching_debriefs'::regclass and tgname=a and not tgisinternal and (tgtype & 2)<>0 and (tgtype & 16)<>0)
    or not exists (select 1 from pg_catalog.pg_trigger where tgrelid='public.coaching_debriefs'::regclass and tgname=b and not tgisinternal and (tgtype & 2)<>0 and (tgtype & 16)<>0)
  then raise exception 'Les deux triggers débrief doivent être BEFORE'; end if;
end$$;

drop policy if exists "coaching_debriefs_read" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_insert" on public.coaching_debriefs;
drop policy if exists "coaching_debriefs_update" on public.coaching_debriefs;
create policy coaching_debriefs_read on public.coaching_debriefs
for select to authenticated using (
  exists (
    select 1 from public.coaching_sessions s
    where s.id=coaching_debriefs.session_id
      and ((coalesce(s.workflow_version,1)<2 and
            (coaching_debriefs.publication_status='published' or s.owner_id=(select auth.uid()) or private.coaching_role(s.id)='coach'))
        or (coalesce(s.workflow_version,1)>=2 and (s.status='ended' or s.phase='completed') and exists (
          select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=(select auth.uid())
            and m.invitation_status in ('accepted','active')
            and (m.role in ('coach','driver','solo') or s.owner_id=(select auth.uid())))))
  )
);
create policy coaching_debriefs_insert on public.coaching_debriefs
for insert to authenticated with check (
  exists (
    select 1 from public.coaching_sessions s
    where s.id=coaching_debriefs.session_id
      and s.owner_id=coaching_debriefs.owner_id
      and ((coalesce(s.workflow_version,1)<2 and (s.owner_id=(select auth.uid()) or private.coaching_role(s.id)='coach'))
        or (coalesce(s.workflow_version,1)>=2 and (s.status='ended' or s.phase='completed') and exists (
          select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=(select auth.uid())
            and m.role in ('coach','driver','solo') and m.invitation_status in ('accepted','active'))))
  )
);
create policy coaching_debriefs_update on public.coaching_debriefs
for update to authenticated using (
  exists (
    select 1 from public.coaching_sessions s
    where s.id=coaching_debriefs.session_id
      and ((coalesce(s.workflow_version,1)<2 and (s.owner_id=(select auth.uid()) or private.coaching_role(s.id)='coach'))
        or (coalesce(s.workflow_version,1)>=2 and (s.status='ended' or s.phase='completed') and exists (
          select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=(select auth.uid())
            and m.role in ('coach','driver','solo') and m.invitation_status in ('accepted','active'))))
  )
) with check (
  exists (
    select 1 from public.coaching_sessions s
    where s.id=coaching_debriefs.session_id
      and s.owner_id=coaching_debriefs.owner_id
      and ((coalesce(s.workflow_version,1)<2 and (s.owner_id=(select auth.uid()) or private.coaching_role(s.id)='coach'))
        or (coalesce(s.workflow_version,1)>=2 and (s.status='ended' or s.phase='completed') and exists (
          select 1 from public.coaching_members m where m.session_id=s.id and m.user_id=(select auth.uid())
            and m.role in ('coach','driver','solo') and m.invitation_status in ('accepted','active'))))
  )
);

-- Privilèges minimaux vérifiés contre les usages locaux : DELETE reste requis par la suppression de compte.
revoke all on table public.coaching_live_points,public.coaching_trace_points,public.coaching_markers,public.coaching_debriefs from public,anon;
revoke update on table public.coaching_live_points,public.coaching_trace_points,public.coaching_markers from authenticated;
grant select,insert,delete on table public.coaching_live_points,public.coaching_trace_points,public.coaching_markers to authenticated;
grant select,insert,update,delete on table public.coaching_debriefs to authenticated;

-- Toutes les validations critiques sont bloquantes et précèdent ROLLBACK/COMMIT.
do $$declare bad text; n integer;begin
  select string_agg(c.relname,', ') into bad from pg_catalog.pg_class c join pg_catalog.pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname='public' and c.relname in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs') and not c.relrowsecurity;
  if bad is not null then raise exception 'V10.42.2 annulée : RLS désactivée sur %',bad; end if;

  select string_agg(p.tablename||'.'||p.policyname||' ['||p.cmd||']',', ' order by p.tablename,p.policyname) into bad
  from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs')
    and p.cmd in ('SELECT','ALL') and (p.tablename,p.policyname) not in
      (('coaching_live_points','coaching_v1042_live_select'),('coaching_trace_points','coaching_v1042_trace_select'),('coaching_markers','coaching_v1042_markers_select'),('coaching_debriefs','coaching_debriefs_read'));
  if bad is not null then raise exception 'V10.42.2 annulée : policy SELECT/ALL inattendue : %',bad; end if;
  select count(*) into n from pg_catalog.pg_policies p where p.schemaname='public' and p.cmd='SELECT' and p.permissive='PERMISSIVE'
    and (p.tablename,p.policyname) in (('coaching_live_points','coaching_v1042_live_select'),('coaching_trace_points','coaching_v1042_trace_select'),('coaching_markers','coaching_v1042_markers_select'),('coaching_debriefs','coaching_debriefs_read'));
  if n<>4 then raise exception 'V10.42.2 annulée : exactement 4 policies SELECT attendues, % trouvées',n; end if;
  select count(*) into n from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename='coaching_debriefs' and p.policyname in ('coaching_debriefs_read','coaching_debriefs_insert','coaching_debriefs_update');
  if n<>3 then raise exception 'V10.42.2 annulée : exactement 3 policies débrief attendues'; end if;

  select string_agg(g.grantee||':'||g.table_name||':'||g.privilege_type,', ') into bad
  from information_schema.role_table_grants g where g.table_schema='public' and g.table_name in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs')
    and (g.grantee in ('PUBLIC','anon') or (g.grantee='authenticated' and not ((g.table_name in ('coaching_live_points','coaching_trace_points','coaching_markers') and g.privilege_type in ('SELECT','INSERT','DELETE')) or (g.table_name='coaching_debriefs' and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')))));
  if bad is not null then raise exception 'V10.42.2 annulée : privilège inattendu : %',bad; end if;
  select count(*) into n from information_schema.role_table_grants g where g.table_schema='public' and g.grantee='authenticated'
    and ((g.table_name in ('coaching_live_points','coaching_trace_points','coaching_markers') and g.privilege_type in ('SELECT','INSERT','DELETE')) or (g.table_name='coaching_debriefs' and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')));
  if n<>13 then raise exception 'V10.42.2 annulée : 13 privilèges authenticated attendus, % trouvés',n; end if;

  if has_function_privilege('PUBLIC','private.guard_coaching_debrief_contributions_v1042()','EXECUTE') or has_function_privilege('anon','private.guard_coaching_debrief_contributions_v1042()','EXECUTE')
    or has_function_privilege('PUBLIC','private.can_read_coaching_live_point_v1042(uuid,uuid)','EXECUTE') or has_function_privilege('anon','private.can_read_coaching_live_point_v1042(uuid,uuid)','EXECUTE')
    or has_function_privilege('PUBLIC','private.can_read_coaching_trace_point_v1042(uuid,uuid)','EXECUTE') or has_function_privilege('anon','private.can_read_coaching_trace_point_v1042(uuid,uuid)','EXECUTE')
    or has_function_privilege('PUBLIC','private.can_read_coaching_marker_v1042(uuid,uuid)','EXECUTE') or has_function_privilege('anon','private.can_read_coaching_marker_v1042(uuid,uuid)','EXECUTE')
    or has_function_privilege('PUBLIC','public.get_my_coaching_sessions(uuid)','EXECUTE') or has_function_privilege('anon','public.get_my_coaching_sessions(uuid)','EXECUTE')
    or has_function_privilege('PUBLIC','private.bump_coaching_debrief_revision()','EXECUTE') or has_function_privilege('anon','private.bump_coaching_debrief_revision()','EXECUTE')
  then raise exception 'V10.42.2 annulée : EXECUTE PUBLIC/anon résiduel'; end if;
end$$;


-- Vérifications dans la transaction avant annulation.
select * from v1042_policy_inventory_before order by tablename,policyname;
select * from v1042_table_privileges_before order by table_name,grantee,privilege_type;
select policyname,tablename,cmd
from pg_catalog.pg_policies
where schemaname='public'
  and tablename in ('coaching_live_points','coaching_trace_points','coaching_markers','coaching_debriefs')
order by tablename,policyname;
select routine_schema,routine_name,security_type
from information_schema.routines
where routine_schema in ('private','public')
  and routine_name in (
    'can_read_coaching_live_point_v1042',
    'can_read_coaching_trace_point_v1042',
    'can_read_coaching_marker_v1042',
    'guard_coaching_debrief_contributions_v1042',
    'get_my_coaching_sessions'
  )
order by routine_schema,routine_name;

commit;

-- Rapport informatif uniquement : toutes les assertions critiques ont précédé COMMIT.
select 'V10.42.2 appliquée : assertions transactionnelles validées' as result;
