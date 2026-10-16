create extension if not exists pg_cron;
select cron.schedule('ops-live-purge-v2','*/15 * * * *','select public.ops_live_purge_expired(100)');

