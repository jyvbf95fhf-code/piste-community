-- Emergency withdrawal ONLY on shnwqdkiapgcftbnhilh, after disabling its ops-live
-- Edge Function. Not applied during normal installation. Never targets Coaching.
begin;
select cron.unschedule(jobid) from cron.job where jobname='ops-live-purge-v2';
do $$declare f record;begin
 for f in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.proname like 'ops_live_%'
 loop execute format('revoke execute on function %I.%I(%s) from public,anon,authenticated,service_role',f.nspname,f.proname,f.args);end loop;
end $$;
revoke all on public.ops_live_publications,public.ops_live_access,public.ops_live_invites,public.ops_live_commands,public.ops_live_points from anon,authenticated,service_role;
drop policy if exists ops_live_private_version_signals on realtime.messages;
commit;
-- No table/trace/archive deletion. Reschedule ONLY the OPS job to restore it;
-- restore reviewed OPS grants and the OPS function separately. Purged data cannot
-- be restored by this withdrawal; personal archives are independent.
