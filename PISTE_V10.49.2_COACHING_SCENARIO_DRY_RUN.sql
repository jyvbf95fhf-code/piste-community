-- V10.49.2 FINAL DRY RUN ONLY. Read-only verification of the prepared APPLY.
-- No DDL, DML, RPC invocation, SET, bucket write or publication change.

select table_schema,table_name
from information_schema.tables
where table_schema='public' and table_name in ('coaching_session_scenarios','coaching_scenario_reads');

select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in ('coaching_session_scenarios','coaching_scenario_reads')
order by table_name,ordinal_position;

select conrelid::regclass::text as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (to_regclass('public.coaching_session_scenarios'),to_regclass('public.coaching_scenario_reads'))
order by table_name,conname;

select table_schema,table_name,column_name
from information_schema.columns
where table_schema='public' and table_name='coaching_sessions'
  and column_name in ('scenario_title','scenario_text','scenario_photo_url','scenario_acknowledged_at')
order by column_name;

select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,coalesce(p.proacl::text,'') as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.proname in ('coaching_v10492_member','coaching_v10492_editor','coaching_v10492_validate_paths','coaching_v10492_scenario_guard','create_coaching_scenario_v10492','update_coaching_scenario_v10492','append_coaching_scenario_photo_v10492','delete_coaching_scenario_v10492','abort_coaching_scenario_v10492','mark_coaching_scenario_read_v10492','get_coaching_scenario_v10492','create_coaching_people_session_v10492')
order by schema_name,proname,args;

select routine_schema,routine_name,grantee,privilege_type
from information_schema.routine_privileges
where routine_schema='public' and routine_name in ('create_coaching_scenario_v10492','update_coaching_scenario_v10492','append_coaching_scenario_photo_v10492','delete_coaching_scenario_v10492','abort_coaching_scenario_v10492','mark_coaching_scenario_read_v10492','get_coaching_scenario_v10492','create_coaching_people_session_v10492')
order by routine_name,grantee,privilege_type;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where (schemaname='public' and tablename in ('coaching_session_scenarios','coaching_scenario_reads'))
   or (schemaname='storage' and tablename='objects' and policyname like 'coaching_scenario_%_v10492')
order by schemaname,tablename,policyname;

select n.nspname as schema_name,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and ((n.nspname='public' and c.relname='coaching_session_scenarios') or t.tgname='coaching_scenario_guard_v10492')
order by schema_name,c.relname,t.tgname;

select id,name,public
from storage.buckets
where id='coaching-scenarios';

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='storage' and tablename='objects' and policyname in ('coaching_scenario_storage_read_v10492','coaching_scenario_storage_insert_v10492','coaching_scenario_storage_delete_v10492')
order by policyname;

select pubname,schemaname,tablename
from pg_publication_tables
where pubname='supabase_realtime' and tablename in ('coaching_sessions','coaching_debrief_observations','coaching_session_scenarios','coaching_scenario_reads')
order by tablename;
