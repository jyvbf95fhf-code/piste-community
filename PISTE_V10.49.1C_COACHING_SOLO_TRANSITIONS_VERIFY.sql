-- V10.49.1C — vérification lecture seule. Aucun DDL, DML ou appel RPC.
select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in ('start_coaching_laying','mark_coaching_track_ready','start_driver_run','finish_driver_run'))
   or (n.nspname='private' and p.proname in ('can_record_people_point_v10423','can_read_coaching_trace_point_v1042','can_read_coaching_marker_v1042','can_share_coaching_position_v10423','can_annotate_people_v10423'))
order by schema_name,p.proname,args;

select routine_schema,routine_name,grantee,privilege_type
from information_schema.routine_privileges
where (routine_schema='public' and routine_name in ('start_coaching_laying','mark_coaching_track_ready','start_driver_run','finish_driver_run'))
   or (routine_schema='private' and routine_name in ('can_record_people_point_v10423','can_read_coaching_trace_point_v1042','can_read_coaching_marker_v1042','can_share_coaching_position_v10423','can_annotate_people_v10423'))
order by routine_schema,routine_name,grantee,privilege_type;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('coaching_trace_points','coaching_live_points','coaching_current_positions','coaching_markers')
order by tablename,policyname;

select n.nspname as schema_name,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and c.relname in ('coaching_sessions','coaching_members','coaching_trace_points','coaching_live_points','coaching_markers')
order by c.relname,t.tgname;

select has_function_privilege('anon','public.start_coaching_laying(uuid)','EXECUTE') as anon_start_laying,
       has_function_privilege('anon','public.mark_coaching_track_ready(uuid)','EXECUTE') as anon_track_ready,
       has_function_privilege('anon','public.start_driver_run(uuid)','EXECUTE') as anon_start_driver,
       has_function_privilege('anon','public.finish_driver_run(uuid)','EXECUTE') as anon_finish_driver;
