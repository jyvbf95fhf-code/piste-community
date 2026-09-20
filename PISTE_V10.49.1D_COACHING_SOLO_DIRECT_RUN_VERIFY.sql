-- V10.49.1D — vérification lecture seule. Aucun DDL, DML ou appel RPC.
select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('start_solo_run','finish_solo_run','finish_coaching_track_v1049')
order by p.proname,args;

select routine_schema,routine_name,grantee,privilege_type
from information_schema.routine_privileges
where routine_schema='public' and routine_name in ('start_solo_run','finish_solo_run','finish_coaching_track_v1049')
order by routine_name,grantee,privilege_type;

select has_function_privilege('anon','public.start_solo_run(uuid)','EXECUTE') as anon_start_solo,
       has_function_privilege('anon','public.finish_solo_run(uuid)','EXECUTE') as anon_finish_solo,
       has_function_privilege('authenticated','public.start_solo_run(uuid)','EXECUTE') as authenticated_start_solo,
       has_function_privilege('authenticated','public.finish_solo_run(uuid)','EXECUTE') as authenticated_finish_solo;

select column_name,data_type
from information_schema.columns
where table_schema='public' and table_name='coaching_sessions'
  and column_name in ('status','phase','driver_started_at','driver_finished_at','track_started_at','track_started_source','pause_state','debrief_status')
order by column_name;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('coaching_sessions','coaching_live_points','coaching_trace_points','coaching_markers')
order by tablename,policyname;

select n.nspname as schema_name,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and c.relname='coaching_sessions'
order by t.tgname;
