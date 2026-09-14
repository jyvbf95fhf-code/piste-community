-- V10.49 verification only. Read-only: no DDL, DML, RPC invocation or SET.
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in ('coaching_sessions','training_routes','coaching_pause_events','coaching_participation_ledger','coaching_debrief_observations')
order by table_name,ordinal_position;

select conrelid::regclass::text as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid::regclass::text in ('public.coaching_sessions','public.training_routes','public.coaching_pause_events','public.coaching_debrief_observations')
order by table_name,conname;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('coaching_pause_events','coaching_participation_ledger','coaching_debrief_observations')
order by tablename,policyname;

select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname,p.proname) in (('public','set_coaching_pause'),('public','finish_coaching_track_v1049'),('public','close_coaching_debrief_v1049'),('private','coaching_v1049_is_final_reader'),('private','coaching_v1049_observation_guard'))
order by 1,2;

select routine_schema,routine_name,grantee,privilege_type
from information_schema.routine_privileges
where (routine_schema,routine_name) in (('public','set_coaching_pause'),('public','finish_coaching_track_v1049'),('public','close_coaching_debrief_v1049'))
order by routine_name,grantee,privilege_type;

select table_schema,table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('coaching_pause_events','coaching_participation_ledger','coaching_debrief_observations')
order by table_name,grantee,privilege_type;

select n.nspname as schema_name,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and t.tgname like '%v1049%'
order by c.relname,t.tgname;

select pubname,schemaname,tablename
from pg_publication_tables
where pubname='supabase_realtime' and tablename in ('coaching_sessions','coaching_pause_events','coaching_debrief_observations','coaching_participation_ledger')
order by tablename;
