-- V10.49.1D Solo search-choice fix — read-only verification. No DDL, DML or RPC calls.
select
  n.nspname as schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef,
  p.proconfig,
  position('solo_mode boolean' in pg_get_functiondef(p.oid))>0 as solo_detection_present,
  position('and not solo_mode' in pg_get_functiondef(p.oid))>0 as solo_bypass_present,
  position('Attendez le choix de recherche du Traceur' in pg_get_functiondef(p.oid))>0 as classic_guard_preserved
from pg_proc as p
join pg_namespace as n on n.oid=p.pronamespace
where n.nspname='private'
  and p.proname='guard_coaching_deferred_transition_v1045'
  and pg_get_function_identity_arguments(p.oid)='';

select
  tg.tgname,
  tg.tgenabled,
  pg_get_triggerdef(tg.oid) as trigger_definition
from pg_trigger as tg
where tg.tgrelid='public.coaching_sessions'::regclass
  and not tg.tgisinternal
  and tg.tgname='coaching_deferred_transition_v1045';

select has_function_privilege(
         'public',
         'private.guard_coaching_deferred_transition_v1045()',
         'EXECUTE'
       ) as public_execute,
       has_function_privilege(
         'anon',
         'private.guard_coaching_deferred_transition_v1045()',
         'EXECUTE'
       ) as anon_execute,
       has_function_privilege(
         'authenticated',
         'private.guard_coaching_deferred_transition_v1045()',
         'EXECUTE'
       ) as authenticated_execute;
