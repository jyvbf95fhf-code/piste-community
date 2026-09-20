-- V10.49.1D corrective patch — read-only verification. No DDL, DML or RPC calls.
with solo_start as (
  select pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='start_solo_run'
    and pg_get_function_identity_arguments(p.oid)='p_session_id uuid'
)
select
  count(*)=1 as function_present,
  coalesce(bool_and(position('v_started_at timestamptz' in definition)>0),false) as local_timestamp_qualified,
  coalesce(bool_and(position('coalesce(cs.driver_started_at,v_started_at)' in definition)>0),false) as driver_timestamp_qualified,
  coalesce(bool_and(position('coalesce(cs.track_started_at,v_started_at)' in definition)>0),false) as track_timestamp_qualified,
  coalesce(bool_and(position('coalesce(driver_started_at,started_at)' in definition)=0),false) as ambiguous_driver_reference_absent,
  coalesce(bool_and(position('coalesce(track_started_at,started_at)' in definition)=0),false) as ambiguous_track_reference_absent
from solo_start;

select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('start_solo_run','finish_solo_run')
order by p.proname;

select has_function_privilege('anon','public.start_solo_run(uuid)','EXECUTE') as anon_start_solo,
       has_function_privilege('authenticated','public.start_solo_run(uuid)','EXECUTE') as authenticated_start_solo,
       has_function_privilege('anon','public.finish_solo_run(uuid)','EXECUTE') as anon_finish_solo,
       has_function_privilege('authenticated','public.finish_solo_run(uuid)','EXECUTE') as authenticated_finish_solo;
