begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Prepared only: never executed by Codex.
-- Fail closed if any existing object collides with this new namespace.
do $$
begin
 if exists(select 1 from pg_catalog.pg_namespace where nspname='piste_admin_v1044') then
  raise exception 'V10.44 déjà présent : auditer avant de réappliquer';
 end if;
 if pg_catalog.to_regclass('public.profiles') is null or pg_catalog.to_regclass('public.pistes') is null or pg_catalog.to_regclass('public.entrainements') is null or pg_catalog.to_regclass('public.coaching_sessions') is null then raise exception 'Baseline incomplète'; end if;
end $$;
create schema piste_admin_v1044;
revoke all on schema piste_admin_v1044 from public,anon,authenticated;
create table piste_admin_v1044.administrators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
create table piste_admin_v1044.feedback (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 subject text not null check(char_length(subject) between 1 and 120),
 message text not null check(char_length(message) between 1 and 4000),
 context text check(char_length(context)<=80),
 status text not null default 'new' check(status in ('new','read','todo','done')),
 created_at timestamptz not null default now(),
 revision integer not null default 0,
 status_changed_at timestamptz,
 status_changed_by uuid references auth.users(id) on delete set null
);
create index feedback_user_created_v1044 on piste_admin_v1044.feedback(user_id,created_at desc);
create index feedback_status_created_v1044 on piste_admin_v1044.feedback(status,created_at desc);
alter table piste_admin_v1044.administrators enable row level security;
alter table piste_admin_v1044.feedback enable row level security;
-- No direct table policies or privileges: only the bounded RPCs below.
revoke all on table piste_admin_v1044.administrators,piste_admin_v1044.feedback from public,anon,authenticated;

create function public.piste_admin_access_v1044() returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then return false; end if;
 return exists(select 1 from piste_admin_v1044.administrators a where a.user_id=auth.uid());
end $$;
revoke all on function public.piste_admin_access_v1044() from public,anon,authenticated;
grant execute on function public.piste_admin_access_v1044() to authenticated;

-- Private metadata projections. No GPS, names of missions, places, emails or contributions.
create view piste_admin_v1044.sessions as
 select id,owner_id as user_id,'ops'::text as kind,created_at,null::timestamptz as ended_at,
  case when distance_km>=0 and distance_km::text not in ('NaN','Infinity','-Infinity') then distance_km end as distance_km,
  'recorded'::text as status from public.pistes
 union all
 select id,owner_id,'training',created_at,null::timestamptz,
  case when distance_km>=0 and distance_km::text not in ('NaN','Infinity','-Infinity') then distance_km end,
  'recorded' from public.entrainements
 union all
 select id,owner_id,'coaching',created_at,ended_at,null::numeric,status from public.coaching_sessions;
create view piste_admin_v1044.users as
 with sessions as (
  select user_id,count(*) as sessions_count,count(*) filter(where kind='ops') as ops_count,
   count(*) filter(where kind='training') as training_count,count(*) filter(where kind='coaching') as coaching_count,
   sum(distance_km) as distance_km,max(created_at) filter(where created_at<=now()) as latest_session_at
  from piste_admin_v1044.sessions group by user_id
 ), feedback as (
  select user_id,count(*) as feedback_count,max(created_at) as latest_feedback_at from piste_admin_v1044.feedback group by user_id
 )
 select u.id as user_id,p.display_name,u.created_at,
  greatest(case when u.last_sign_in_at<=now() then u.last_sign_in_at end,s.latest_session_at,f.latest_feedback_at) as last_activity,
  case when u.banned_until>now() then 'suspended' when u.confirmed_at is null then 'pending' else 'confirmed' end as account_status,
  coalesce(s.sessions_count,0) as sessions_count,coalesce(s.ops_count,0) as ops_count,
  coalesce(s.training_count,0) as training_count,coalesce(s.coaching_count,0) as coaching_count,
  s.distance_km,s.latest_session_at,coalesce(f.feedback_count,0) as feedback_count
 from auth.users u left join public.profiles p on p.user_id=u.id
 left join sessions s on s.user_id=u.id left join feedback f on f.user_id=u.id;
create view piste_admin_v1044.events as
 select 'account:'||u.id::text as event_id,u.id as user_id,u.created_at as occurred_at,'account'::text as kind,'Compte créé'::text as title from auth.users u
 union all select kind||':'||id::text,user_id,created_at,kind,
  case kind when 'ops' then 'Piste OPS enregistrée' when 'training' then 'Entraînement enregistré' else 'Session Coaching créée' end from piste_admin_v1044.sessions
 union all select 'ended:'||id::text,user_id,ended_at,'coaching','Session Coaching terminée' from piste_admin_v1044.sessions where kind='coaching' and status='ended' and ended_at is not null
 union all select 'feedback:'||id::text,user_id,created_at,'feedback','Retour envoyé' from piste_admin_v1044.feedback;
revoke all on table piste_admin_v1044.sessions,piste_admin_v1044.users,piste_admin_v1044.events from public,anon,authenticated;

create function public.piste_admin_query_v1044(
 p_section text,p_search text default '',p_filter text default 'all',p_period integer default 30,
 p_offset integer default 0,p_user_id uuid default null,p_sort text default 'recent'
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; items jsonb; total bigint; cutoff timestamptz;
begin
 if auth.uid() is null or not public.piste_admin_access_v1044() then raise exception 'Accès Admin refusé' using errcode='42501'; end if;
 if p_section is null or p_section not in ('dashboard','users','profile','activity','statistics','feedback') or p_period is null or p_period not in (7,30,90) or p_offset is null or p_offset<0 or p_offset>100000 or p_search is null or char_length(p_search)>120 or p_sort is null or p_sort not in ('recent','oldest','activity','sessions') then raise exception 'Filtres invalides' using errcode='22023'; end if;
 cutoff:=now()-pg_catalog.make_interval(days=>p_period);
 if p_section in ('dashboard','statistics') then
  select jsonb_build_object(
   'users_total',count(*),'new_7',count(*) filter(where created_at>=now()-interval '7 days'),
   'new_30',count(*) filter(where created_at>=now()-interval '30 days'),
   'active_7',count(*) filter(where last_activity>=now()-interval '7 days'),
   'active_30',count(*) filter(where last_activity>=now()-interval '30 days')
  ) into result from piste_admin_v1044.users;
  select result||jsonb_build_object('sessions_total',count(*),'ops',count(*) filter(where kind='ops'),
   'training',count(*) filter(where kind='training'),'coaching',count(*) filter(where kind='coaching'),
   'coaching_ended',count(*) filter(where kind='coaching' and status='ended'),
   'distance_km',sum(distance_km),'distance_records',count(distance_km)) into result from piste_admin_v1044.sessions;
  result:=jsonb_build_object('kpis',result||jsonb_build_object('feedback_new',(select count(*) from piste_admin_v1044.feedback where status='new')));
  select jsonb_agg(to_jsonb(x) order by x.days) into items from (
   select n as days,(select count(*) from auth.users where created_at>=now()-pg_catalog.make_interval(days=>n)) as new_users,
   (select count(*) from piste_admin_v1044.users where last_activity>=now()-pg_catalog.make_interval(days=>n)) as active_users,
   (select count(*) from piste_admin_v1044.sessions where created_at>=now()-pg_catalog.make_interval(days=>n)) as sessions
   from unnest(array[7,30,90]) n
  ) x;
  result:=result||jsonb_build_object('periods',items);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.user_id),'[]'::jsonb) into items from (select * from piste_admin_v1044.users order by created_at desc,user_id limit 5) x;
  result:=result||jsonb_build_object('new_users',items);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc,x.event_id),'[]'::jsonb) into items from (select e.*,u.display_name from piste_admin_v1044.events e left join public.profiles u on u.user_id=e.user_id order by e.occurred_at desc,e.event_id limit 8) x;
  result:=result||jsonb_build_object('events',items);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into items from (select f.id,f.user_id,f.subject,f.status,f.created_at,p.display_name from piste_admin_v1044.feedback f left join public.profiles p on p.user_id=f.user_id order by f.created_at desc,f.id limit 5) x;
  return result||jsonb_build_object('feedback',items,'generated_at',now());
 elsif p_section='users' then
  if p_filter is null or p_filter not in ('all','active','inactive','new','feedback','recent_session','ops','training','coaching') then raise exception 'Filtre invalide' using errcode='22023'; end if;
  with filtered as (
   select * from piste_admin_v1044.users u where
    (p_search='' or strpos(lower(coalesce(display_name,'')),lower(p_search))>0 or strpos(user_id::text,lower(p_search))>0)
    and case p_filter when 'active' then last_activity>=cutoff when 'inactive' then last_activity<cutoff or last_activity is null
     when 'new' then created_at>=cutoff when 'feedback' then feedback_count>0 when 'recent_session' then latest_session_at>=cutoff
     when 'ops' then ops_count>0 and ops_count>=greatest(training_count,coaching_count)
     when 'training' then training_count>0 and training_count>=greatest(ops_count,coaching_count)
     when 'coaching' then coaching_count>0 and coaching_count>=greatest(ops_count,training_count) else true end
  ), page as (
   select * from filtered order by case when p_sort='oldest' then created_at end asc,
    case when p_sort='activity' then last_activity end desc nulls last,
    case when p_sort='sessions' then sessions_count end desc,
    created_at desc,user_id limit 50 offset p_offset
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by case when p_sort='oldest' then created_at end asc,case when p_sort='activity' then last_activity end desc nulls last,case when p_sort='sessions' then sessions_count end desc,created_at desc,user_id) from page),'[]'::jsonb),'total',(select count(*) from filtered),'offset',p_offset,'limit',50) into result;
  return result;
 elsif p_section='profile' then
  if p_user_id is null then raise exception 'Utilisateur requis' using errcode='22023'; end if;
  select to_jsonb(u) into result from piste_admin_v1044.users u where user_id=p_user_id;
  if result is null then raise exception 'Compte introuvable' using errcode='P0002'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc,id),'[]'::jsonb) into items from (select * from piste_admin_v1044.sessions where user_id=p_user_id order by created_at desc,id limit 20) x;
  result:=jsonb_build_object('user',result,'sessions',items);
  select coalesce(jsonb_agg(to_jsonb(x) order by occurred_at desc,event_id),'[]'::jsonb) into items from (select * from piste_admin_v1044.events where user_id=p_user_id order by occurred_at desc,event_id limit 20) x;
  result:=result||jsonb_build_object('events',items);
  select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc,id),'[]'::jsonb) into items from (select id,user_id,subject,message,context,status,created_at,revision from piste_admin_v1044.feedback where user_id=p_user_id order by created_at desc,id limit 20) x;
  return result||jsonb_build_object('feedback',items);
 elsif p_section='activity' then
  if p_filter is null or p_filter not in ('all','account','ops','training','coaching','feedback') then raise exception 'Filtre invalide' using errcode='22023'; end if;
  with filtered as (select e.*,p.display_name from piste_admin_v1044.events e left join public.profiles p on p.user_id=e.user_id where occurred_at>=cutoff and (p_filter='all' or kind=p_filter)), page as (select * from filtered order by occurred_at desc,event_id limit 50 offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by occurred_at desc,event_id) from page),'[]'::jsonb),'total',(select count(*) from filtered),'offset',p_offset,'limit',50) into result;
  return result;
 else
  if p_filter is null or p_filter not in ('all','new','read','todo','done') then raise exception 'Statut invalide' using errcode='22023'; end if;
  with filtered as (select f.id,f.user_id,f.subject,f.message,f.context,f.status,f.created_at,f.revision,p.display_name from piste_admin_v1044.feedback f left join public.profiles p on p.user_id=f.user_id where (p_filter='all' or f.status=p_filter) and (p_search='' or strpos(lower(f.subject||' '||f.message||' '||coalesce(p.display_name,'')),lower(p_search))>0)), page as (select * from filtered order by created_at desc,id limit 50 offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id) from page),'[]'::jsonb),'total',(select count(*) from filtered),'offset',p_offset,'limit',50) into result;
  return result;
 end if;
end $$;
revoke all on function public.piste_admin_query_v1044(text,text,text,integer,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.piste_admin_query_v1044(text,text,text,integer,integer,uuid,text) to authenticated;

create function public.piste_admin_feedback_status_v1044(p_id uuid,p_status text,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.piste_admin_access_v1044() then raise exception 'Accès Admin refusé' using errcode='42501'; end if;
 if p_status is null or p_status not in ('new','read','todo','done') then raise exception 'Statut invalide' using errcode='22023'; end if;
 update piste_admin_v1044.feedback set status=p_status,revision=revision+1,status_changed_at=now(),status_changed_by=auth.uid()
 where id=p_id and revision=p_revision returning jsonb_build_object('id',id,'status',status,'revision',revision) into result;
 if result is null then raise exception 'Retour modifié entre-temps ou introuvable. Actualisez.' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function public.piste_admin_feedback_status_v1044(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.piste_admin_feedback_status_v1044(uuid,text,integer) to authenticated;

create function public.piste_feedback_submit_v1044(p_id uuid,p_subject text,p_message text,p_context text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing piste_admin_v1044.feedback;
begin
 if uid is null then raise exception 'Connexion requise' using errcode='42501'; end if;
 if p_id is null or p_subject is null or char_length(btrim(p_subject)) not between 1 and 120 or p_message is null or char_length(btrim(p_message)) not between 1 and 4000 or char_length(p_context)>80 then raise exception 'Retour invalide' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,1044));
 select * into existing from piste_admin_v1044.feedback where id=p_id;
 if found then
  if existing.user_id=uid and existing.subject=btrim(p_subject) and existing.message=btrim(p_message) and existing.context is not distinct from p_context then return existing.id; end if;
  raise exception 'Envoi non confirmé : renouveler la demande' using errcode='22023';
 end if;
 if (select count(*) from piste_admin_v1044.feedback where user_id=uid and created_at>now()-interval '1 hour')>=5 then raise exception 'Maximum 5 retours par heure' using errcode='54000'; end if;
 insert into piste_admin_v1044.feedback(id,user_id,subject,message,context) values(p_id,uid,btrim(p_subject),btrim(p_message),p_context);
 return p_id;
end $$;
revoke all on function public.piste_feedback_submit_v1044(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.piste_feedback_submit_v1044(uuid,text,text,text) to authenticated;

-- Deployment self-checks, not executed by Codex. No bootstrap or test data is inserted.
do $$
declare obj text;
begin
 foreach obj in array array['administrators','feedback','sessions','users','events'] loop
  if pg_catalog.has_table_privilege('authenticated','piste_admin_v1044.'||obj,'SELECT') or pg_catalog.has_table_privilege('anon','piste_admin_v1044.'||obj,'SELECT') then raise exception 'Privilège direct inattendu : %',obj; end if;
 end loop;
 if pg_catalog.has_schema_privilege('authenticated','piste_admin_v1044','USAGE') then raise exception 'Schéma privé exposé'; end if;
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='piste_admin_v1044' and c.relkind='r' and not c.relrowsecurity) then raise exception 'RLS manquante'; end if;
end $$;

commit;
