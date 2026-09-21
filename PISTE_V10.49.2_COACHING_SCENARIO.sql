-- V10.49.2 APPLY — PREPARED ONLY. DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL.
-- Legacy coaching_sessions.scenario_* columns are intentionally preserved.
-- This migration refuses an unexpected partial install before changing anything.

do $$
begin
  if to_regprocedure('public.create_coaching_people_session_v1045(uuid,jsonb,text)') is null then
    raise exception 'V10.49.2 preflight: historical create RPC signature is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='coaching_sessions' and column_name='scenario_title')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='coaching_sessions' and column_name='scenario_text')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='coaching_sessions' and column_name='scenario_photo_url')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='coaching_sessions' and column_name='scenario_acknowledged_at') then
    raise exception 'V10.49.2 preflight: audited legacy scenario columns diverged';
  end if;
  if to_regclass('public.coaching_session_scenarios') is not null
     or to_regclass('public.coaching_scenario_reads') is not null then
    raise exception 'V10.49.2 preflight: partial install detected; inspect before reapplication';
  end if;
  if exists (select 1 from storage.buckets where id='coaching-scenarios') then
    raise exception 'V10.49.2 preflight: coaching-scenarios bucket already exists; inspect before reapplication';
  end if;
  if exists (select 1 from pg_policies where policyname in ('coaching_scenarios_read_v10492','coaching_scenario_reads_read_v10492','coaching_scenario_storage_read_v10492','coaching_scenario_storage_insert_v10492','coaching_scenario_storage_delete_v10492')) then
    raise exception 'V10.49.2 preflight: scenario policy name collision';
  end if;
  if to_regprocedure('public.create_coaching_scenario_v10492(uuid,text,jsonb)') is not null
     or to_regprocedure('public.update_coaching_scenario_v10492(uuid,text,jsonb)') is not null
     or to_regprocedure('public.append_coaching_scenario_photo_v10492(uuid,text)') is not null
     or to_regprocedure('public.delete_coaching_scenario_v10492(uuid)') is not null
     or to_regprocedure('public.abort_coaching_scenario_v10492(uuid,jsonb)') is not null
     or to_regprocedure('public.mark_coaching_scenario_read_v10492(uuid)') is not null
     or to_regprocedure('public.get_coaching_scenario_v10492(uuid)') is not null
     or to_regprocedure('public.create_coaching_people_session_v10492(uuid,jsonb,text,boolean,text,jsonb)') is not null then
    raise exception 'V10.49.2 preflight: scenario RPC already exists; inspect before reapplication';
  end if;
end $$;

create table public.coaching_session_scenarios (
  session_id uuid primary key references public.coaching_sessions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  scenario_text text not null default '',
  photo_paths jsonb not null default '[]'::jsonb,
  upload_status text not null default 'pending',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  locked_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  constraint coaching_scenario_text_length_v10492 check (char_length(scenario_text) <= 5000),
  constraint coaching_scenario_photos_array_v10492 check (jsonb_typeof(photo_paths)='array'),
  constraint coaching_scenario_photos_count_v10492 check (jsonb_array_length(photo_paths) between 0 and 5),
  constraint coaching_scenario_upload_status_v10492 check (upload_status in ('pending','ready')),
  constraint coaching_scenario_lock_pair_v10492 check ((locked_at is null and locked_by is null) or (locked_at is not null and locked_by is not null))
);
create index coaching_session_scenarios_author_v10492 on public.coaching_session_scenarios(author_id);
create index coaching_session_scenarios_locked_v10492 on public.coaching_session_scenarios(locked_at);

create table public.coaching_scenario_reads (
  session_id uuid not null references public.coaching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default statement_timestamp(),
  role text not null,
  primary key (session_id,user_id),
  constraint coaching_scenario_reads_role_v10492 check (role in ('driver','solo','coach','traceur','observer'))
);
create index coaching_scenario_reads_session_v10492 on public.coaching_scenario_reads(session_id,read_at);

create or replace function private.coaching_v10492_member(p_session_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.coaching_members m where m.session_id=p_session_id and m.user_id=p_user_id and m.invitation_status in ('accepted','active'))
$$;

create or replace function private.coaching_v10492_editor(p_session_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.coaching_sessions s
    join public.coaching_members me on me.session_id=s.id and me.user_id=p_user_id and me.invitation_status in ('accepted','active')
    where s.id=p_session_id and s.status='waiting' and s.phase='preparation' and not exists(select 1 from public.coaching_session_scenarios x where x.session_id=s.id and x.locked_at is not null)
      and ((me.role='coach' and s.owner_id=p_user_id and exists(select 1 from public.coaching_members c where c.session_id=s.id and c.role='coach' and c.invitation_status in ('accepted','active')))
        or (me.role='traceur' and s.owner_id=p_user_id and not exists(select 1 from public.coaching_members c where c.session_id=s.id and c.role='coach' and c.invitation_status in ('accepted','active'))))
  )
$$;

create or replace function private.coaching_v10492_validate_paths(p_session_id uuid,p_paths jsonb)
returns boolean language sql immutable security definer set search_path='' as $$
  select jsonb_typeof(p_paths)='array'
    and jsonb_array_length(p_paths) between 0 and 5
    and not exists(select 1 from jsonb_array_elements_text(p_paths) path where path not like p_session_id::text||'/%' or path like '%.pdf' or path like '%.PDF')
$$;

create or replace function private.coaching_v10492_scenario_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.locked_at is not null then raise exception 'Scénario verrouillé'; end if;
    return old;
  end if;
  if tg_op='UPDATE' and old.locked_at is not null then
    raise exception 'Scénario verrouillé';
  end if;
  if new.session_id is distinct from old.session_id or (tg_op='UPDATE' and new.author_id is distinct from old.author_id) then
    raise exception 'Identité du scénario immuable';
  end if;
  if not private.coaching_v10492_validate_paths(new.session_id,new.photo_paths) then
    raise exception 'Photos de scénario invalides';
  end if;
  new.updated_at:=statement_timestamp();
  return new;
end $$;
create trigger coaching_scenario_guard_v10492 before update or delete on public.coaching_session_scenarios
for each row execute function private.coaching_v10492_scenario_guard();

create or replace function public.create_coaching_scenario_v10492(p_session_id uuid,p_text text,p_photo_paths jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data public.coaching_session_scenarios;
begin
  if uid is null or not private.coaching_v10492_editor(p_session_id,uid) then raise exception 'Éditeur du scénario requis'; end if;
  if not private.coaching_v10492_validate_paths(p_session_id,coalesce(p_photo_paths,'[]'::jsonb)) then raise exception 'Photos de scénario invalides'; end if;
  insert into public.coaching_session_scenarios(session_id,author_id,scenario_text,photo_paths)
  values(p_session_id,uid,coalesce(p_text,''),coalesce(p_photo_paths,'[]'::jsonb)) returning * into row_data;
  return jsonb_build_object('session_id',row_data.session_id,'author_id',row_data.author_id,'text',row_data.scenario_text,'photo_paths',row_data.photo_paths,'upload_status',row_data.upload_status,'created_at',row_data.created_at,'updated_at',row_data.updated_at,'locked_at',row_data.locked_at,'locked_by',row_data.locked_by);
end $$;

create or replace function public.update_coaching_scenario_v10492(p_session_id uuid,p_text text,p_photo_paths jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data public.coaching_session_scenarios;
begin
  if uid is null or not private.coaching_v10492_editor(p_session_id,uid) then raise exception 'Éditeur du scénario requis'; end if;
  if not private.coaching_v10492_validate_paths(p_session_id,coalesce(p_photo_paths,'[]'::jsonb)) then raise exception 'Photos de scénario invalides'; end if;
  update public.coaching_session_scenarios set scenario_text=coalesce(p_text,''),photo_paths=coalesce(p_photo_paths,'[]'::jsonb),upload_status='ready' where session_id=p_session_id and locked_at is null returning * into row_data;
  if not found then raise exception 'Scénario absent ou verrouillé'; end if;
  return jsonb_build_object('session_id',row_data.session_id,'author_id',row_data.author_id,'text',row_data.scenario_text,'photo_paths',row_data.photo_paths,'upload_status',row_data.upload_status,'created_at',row_data.created_at,'updated_at',row_data.updated_at,'locked_at',row_data.locked_at,'locked_by',row_data.locked_by);
end $$;

create or replace function public.append_coaching_scenario_photo_v10492(p_session_id uuid,p_path text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data public.coaching_session_scenarios; paths jsonb;
begin
  if uid is null or not private.coaching_v10492_editor(p_session_id,uid) then raise exception 'Éditeur du scénario requis'; end if;
  if p_path is null or p_path not like p_session_id::text||'/%' or p_path like '%.pdf' or p_path like '%.PDF' then raise exception 'Chemin de photo invalide'; end if;
  select * into row_data from public.coaching_session_scenarios where session_id=p_session_id for update;
  if not found or row_data.upload_status<>'pending' or row_data.locked_at is not null then raise exception 'Scénario non disponible pour upload'; end if;
  paths:=row_data.photo_paths||to_jsonb(p_path);
  if jsonb_array_length(paths)>5 then raise exception 'Maximum de cinq photos'; end if;
  update public.coaching_session_scenarios set photo_paths=paths where session_id=p_session_id returning * into row_data;
  return jsonb_build_object('session_id',row_data.session_id,'photo_paths',row_data.photo_paths,'upload_status',row_data.upload_status);
end $$;

create or replace function public.abort_coaching_scenario_v10492(p_session_id uuid,p_photo_paths jsonb default '[]'::jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
  if uid is null or not private.coaching_v10492_editor(p_session_id,uid) then raise exception 'Éditeur du scénario requis'; end if;
  if not private.coaching_v10492_validate_paths(p_session_id,coalesce(p_photo_paths,'[]'::jsonb)) then raise exception 'Photos de scénario invalides'; end if;
  if not exists(select 1 from public.coaching_session_scenarios where session_id=p_session_id and upload_status='pending' and locked_at is null) then raise exception 'Seul un scénario pending peut être abandonné'; end if;
  delete from public.coaching_session_scenarios where session_id=p_session_id and upload_status='pending' and locked_at is null;
  return found;
end $$;

create or replace function public.delete_coaching_scenario_v10492(p_session_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); deleted boolean;
begin
  if uid is null or not private.coaching_v10492_editor(p_session_id,uid) then raise exception 'Éditeur du scénario requis'; end if;
  delete from public.coaching_session_scenarios where session_id=p_session_id and locked_at is null returning true into deleted;
  if not found then raise exception 'Scénario absent ou verrouillé'; end if;
  return deleted;
end $$;

create or replace function public.mark_coaching_scenario_read_v10492(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); member_role text; locked_row public.coaching_session_scenarios; read_time timestamptz:=statement_timestamp();
begin
  select m.role into member_role from public.coaching_members m where m.session_id=p_session_id and m.user_id=uid and m.invitation_status in ('accepted','active');
  if uid is null or member_role is null or member_role not in ('driver','solo') then raise exception 'Conducteur autorisé requis'; end if;
  if not exists(select 1 from public.coaching_session_scenarios s where s.session_id=p_session_id and s.upload_status='ready') then raise exception 'Scénario non finalisé'; end if;
  insert into public.coaching_scenario_reads(session_id,user_id,read_at,role) values(p_session_id,uid,read_time,member_role)
    on conflict(session_id,user_id) do update set read_at=coalesce(public.coaching_scenario_reads.read_at,excluded.read_at),role=excluded.role;
  update public.coaching_session_scenarios set locked_at=coalesce(locked_at,read_time),locked_by=coalesce(locked_by,uid) where session_id=p_session_id returning * into locked_row;
  if not found then raise exception 'Scénario absent'; end if;
  return jsonb_build_object('session_id',locked_row.session_id,'locked_at',locked_row.locked_at,'locked_by',locked_row.locked_by,'read_at',read_time);
end $$;

create or replace function public.get_coaching_scenario_v10492(p_session_id uuid)
returns jsonb language sql security definer set search_path='' as $$
  select case when private.coaching_v10492_member(p_session_id,(select auth.uid())) then jsonb_build_object('scenario',to_jsonb(s),'reads',(select coalesce(jsonb_agg(to_jsonb(r) order by r.read_at),'[]'::jsonb) from public.coaching_scenario_reads r where r.session_id=p_session_id)) else null end
  from public.coaching_session_scenarios s where s.session_id=p_session_id
$$;

create or replace function public.create_coaching_people_session_v10492(p_route_id uuid,p_members jsonb,p_blind_mode text,p_scenario_enabled boolean,p_scenario_text text default '',p_photo_paths jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare created jsonb; sid uuid; uid uuid:=(select auth.uid());
begin
  if p_scenario_enabled and jsonb_array_length(coalesce(p_photo_paths,'[]'::jsonb))>0 then raise exception 'Les photos doivent être téléversées après la création de la session'; end if;
  created:=public.create_coaching_people_session_v1045(p_route_id,p_members,p_blind_mode); sid:=(created->>'id')::uuid;
  if p_scenario_enabled then perform public.create_coaching_scenario_v10492(sid,coalesce(p_scenario_text,''),coalesce(p_photo_paths,'[]'::jsonb)); end if;
  return created;
end $$;

alter table public.coaching_session_scenarios enable row level security;
alter table public.coaching_scenario_reads enable row level security;
revoke all on public.coaching_session_scenarios from anon,authenticated;
revoke all on public.coaching_scenario_reads from anon,authenticated;
grant select on public.coaching_session_scenarios,public.coaching_scenario_reads to authenticated;

create policy coaching_scenarios_read_v10492 on public.coaching_session_scenarios for select to authenticated
using (private.coaching_v10492_member(session_id,(select auth.uid())));
create policy coaching_scenario_reads_read_v10492 on public.coaching_scenario_reads for select to authenticated
using (private.coaching_v10492_member(session_id,(select auth.uid())));

revoke all on function public.create_coaching_scenario_v10492(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.update_coaching_scenario_v10492(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.delete_coaching_scenario_v10492(uuid) from public,anon,authenticated;
revoke all on function public.append_coaching_scenario_photo_v10492(uuid,text) from public,anon,authenticated;
revoke all on function public.abort_coaching_scenario_v10492(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mark_coaching_scenario_read_v10492(uuid) from public,anon,authenticated;
revoke all on function public.get_coaching_scenario_v10492(uuid) from public,anon,authenticated;
revoke all on function public.create_coaching_people_session_v10492(uuid,jsonb,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_coaching_scenario_v10492(uuid,text,jsonb) to authenticated;
grant execute on function public.update_coaching_scenario_v10492(uuid,text,jsonb) to authenticated;
grant execute on function public.delete_coaching_scenario_v10492(uuid) to authenticated;
grant execute on function public.abort_coaching_scenario_v10492(uuid,jsonb) to authenticated;
grant execute on function public.append_coaching_scenario_photo_v10492(uuid,text) to authenticated;
grant execute on function public.mark_coaching_scenario_read_v10492(uuid) to authenticated;
grant execute on function public.get_coaching_scenario_v10492(uuid) to authenticated;
grant execute on function public.create_coaching_people_session_v10492(uuid,jsonb,text,boolean,text,jsonb) to authenticated;

insert into storage.buckets(id,name,public)
values('coaching-scenarios','coaching-scenarios',false)
on conflict(id) do nothing;
create policy coaching_scenario_storage_read_v10492 on storage.objects for select to authenticated
using (bucket_id='coaching-scenarios' and private.coaching_v10492_member((storage.foldername(name))[1]::uuid,(select auth.uid())));
create policy coaching_scenario_storage_insert_v10492 on storage.objects for insert to authenticated
with check (bucket_id='coaching-scenarios' and private.coaching_v10492_editor((storage.foldername(name))[1]::uuid,(select auth.uid())));
create policy coaching_scenario_storage_delete_v10492 on storage.objects for delete to authenticated
using (bucket_id='coaching-scenarios' and private.coaching_v10492_editor((storage.foldername(name))[1]::uuid,(select auth.uid())));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='coaching_session_scenarios') then
    alter publication supabase_realtime add table public.coaching_session_scenarios;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='coaching_scenario_reads') then
    alter publication supabase_realtime add table public.coaching_scenario_reads;
  end if;
end $$;
