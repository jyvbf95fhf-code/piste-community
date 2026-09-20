-- V10.49.1b read-only verification. No DDL, DML, RPC invocation or SET.
select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname='create_coaching_people_session_v1045')
   or (n.nspname in ('public','private') and p.proname='join_coaching_session')
order by schema_name,p.proname,args;

select routine_schema,routine_name,grantee,privilege_type
from information_schema.routine_privileges
where (routine_schema='public' and routine_name in ('create_coaching_people_session_v1045','join_coaching_session'))
   or (routine_schema='private' and routine_name='join_coaching_session')
order by routine_schema,routine_name,grantee,privilege_type;

select c.relname as table_name,con.conname,pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('coaching_sessions','coaching_members')
order by c.relname,con.conname;

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('coaching_sessions','coaching_members','coaching_live_points','coaching_trace_points','coaching_debriefs')
order by tablename,policyname;

select n.nspname as schema_name,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and c.relname in ('coaching_sessions','coaching_members')
order by c.relname,t.tgname;
