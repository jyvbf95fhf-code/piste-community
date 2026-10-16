-- PROPOSITION UNIQUEMENT. Ne cree aucun job, ne purge aucune donnee a la creation.
-- Le nom de schema private existe deja dans le backend Coaching.
begin;
create schema if not exists private;

-- Purpose-limited SECURITY DEFINER helper: authenticated browser can ask only
-- whether its own exact destination is authorized, never read publication rows.
create function private.ops_live_can_listen(p_topic text)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.ops_live_publications p
  where p.sharing and p.purged_at is null
    and coalesce(p.purge_at, p.active_deadline) > statement_timestamp()
    and p_topic = 'ops-live:' || p.id::text || ':' || p.generation::text
      || ':' || p.channel_epoch::text || ':' || auth.uid()::text
    and (p.owner_id = auth.uid() or exists (
      select 1 from public.ops_live_access a
      where a.publication_id=p.id and a.generation=p.generation
        and a.user_id=auth.uid() and a.revoked_at is null
    ))
 );
$$;
revoke all on function private.ops_live_can_listen(text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.ops_live_can_listen(text) to authenticated;
create policy ops_live_private_version_signals on realtime.messages
for select to authenticated
using (extension='broadcast' and private.ops_live_can_listen(realtime.topic()));
-- No INSERT policy for clients: signals originate only from the trusted server.
-- Existing Coaching policies are not altered.

-- Trusted backend worker only; expiry is also enforced on EVERY read/write.
-- Physical purge is bounded in batches. No periodic job is installed here.
create function public.ops_live_purge_expired(p_limit integer default 100)
returns integer language plpgsql security invoker set search_path = '' as $$
declare removed integer=0; target record;
begin
 if p_limit is null or p_limit < 1 or p_limit > 1000 then
  raise exception 'invalid_limit' using errcode='22023';
 end if;
 -- Expired active publications are frozen at the 24h deadline, then retained.
 update public.ops_live_publications set closed_at=active_deadline,
 purge_at=active_deadline+make_interval(secs=>retention_seconds),
 projection_metadata=jsonb_set(projection_metadata,'{state}','"Fin de piste"'::jsonb),version=version+1
 where purged_at is null and closed_at is null and stopped_at is null
 and active_deadline<=statement_timestamp();
 for target in select id,owner_id from public.ops_live_publications
  where coalesce(purge_at,active_deadline)<=statement_timestamp()
    and (purged_at is null or creation_expires_at<=statement_timestamp())
  order by coalesce(purge_at,active_deadline),id limit p_limit for update skip locked
 loop
  perform public.ops_live_delete(target.id,target.owner_id);
  removed=removed+1;
 end loop;
 return removed;
end $$;
revoke all on function public.ops_live_purge_expired(integer) from public, anon, authenticated;
grant execute on function public.ops_live_purge_expired(integer) to service_role;
commit;
