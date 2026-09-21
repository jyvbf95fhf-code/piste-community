-- V10.49.2 DRY RUN ONLY. Read-only inventory; no DDL, DML, RPC call, SET or storage write.
select table_schema,table_name
from information_schema.tables
where table_schema in ('public','storage')
  and table_name in ('coaching_sessions','coaching_members','coaching_session_scenarios','coaching_scenario_reads','objects')
order by table_schema,table_name;

select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where (table_schema='public' and table_name in ('coaching_sessions','coaching_members','coaching_session_scenarios','coaching_scenario_reads'))
   or (table_schema='storage' and table_name='objects')
order by table_schema,table_name,ordinal_position;

select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef,pg_get_userbyid(p.proowner) as owner,coalesce(p.proacl::text,'') as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private')
  and (p.proname ilike '%coaching%session%' or p.proname ilike '%scenario%' or p.proname ilike '%debrief%')
order by schema_name,p.proname,args;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname in ('public','storage')
  and (tablename in ('coaching_sessions','coaching_members','coaching_session_scenarios','coaching_scenario_reads','objects')
       or policyname ilike '%coaching%' or policyname ilike '%scenario%')
order by schemaname,tablename,policyname;

select n.nspname as schema_name,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and (c.relname in ('coaching_sessions','coaching_members','coaching_session_scenarios','coaching_scenario_reads') or t.tgname ilike '%scenario%')
order by schema_name,c.relname,t.tgname;

select pubname,schemaname,tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and tablename in ('coaching_sessions','coaching_members','coaching_session_scenarios','coaching_scenario_reads')
order by tablename;

select id,name,public,created_at,updated_at
from storage.buckets
where id='coaching-scenarios';
