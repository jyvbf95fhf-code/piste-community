create or replace function public.ops_live_list(p_actor uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'ownerId',p.owner_id,'version',p.version,'generation',p.generation,'closed',p.closed_at is not null) order by p.updated_at desc,p.id),'[]'::jsonb)
 from (select p.* from public.ops_live_publications p where public.ops_live_authorized(p.id,p_actor) order by p.updated_at desc,p.id limit 100) p;
$$;
create function public.ops_live_head(p_id uuid,p_actor uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select public.ops_live_read(p_id,p_actor,p.last_sequence,p.version) from public.ops_live_publications p where p.id=p_id and public.ops_live_authorized(p.id,p_actor);
$$;
create function public.ops_live_pending_invites(p_actor uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'ownerId',p.owner_id,'version',p.version,'generation',p.generation,'expiresAt',i.expires_at)),'[]'::jsonb)
 from public.ops_live_invites i join public.ops_live_publications p on p.id=i.publication_id and p.generation=i.generation
 where i.recipient_id=p_actor and i.consumed_at is null and i.revoked_at is null and i.expires_at>statement_timestamp()
 and p.sharing and p.closed_at is null and p.purged_at is null and p.active_deadline>statement_timestamp();
$$;
create function public.ops_live_accept_invite(p_id uuid,p_actor uuid,p_command uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.ops_live_publications; i public.ops_live_invites;
begin
 select * into p from public.ops_live_publications where id=p_id for update;
 if not found then raise exception 'access_denied' using errcode='42501';end if;
 select * into i from public.ops_live_invites where publication_id=p_id and generation=p.generation and recipient_id=p_actor
 and revoked_at is null and expires_at>statement_timestamp() order by (consumed_at is null) desc,created_at desc limit 1;
 if not found then raise exception 'access_denied' using errcode='42501';end if;
 return public.ops_live_commit(p_id,p_actor,p_command,p.version,'join',jsonb_build_object('tokenHash',i.token_hash));
end $$;
revoke all on function public.ops_live_head(uuid,uuid),public.ops_live_pending_invites(uuid),public.ops_live_accept_invite(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.ops_live_head(uuid,uuid),public.ops_live_pending_invites(uuid),public.ops_live_accept_invite(uuid,uuid,uuid) to service_role;
-- Read-only check of existing login sessions. No Auth table, policy or setting changes.
create function private.ops_live_session_active(p_actor uuid,p_session uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.id=p_session and s.user_id=p_actor and (s.not_after is null or s.not_after>statement_timestamp()));
$$;
revoke all on function private.ops_live_session_active(uuid,uuid) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.ops_live_session_active(uuid,uuid) to service_role;
create function public.ops_live_session_active(p_actor uuid,p_session uuid)
returns boolean language sql stable security invoker set search_path='' as $$select private.ops_live_session_active(p_actor,p_session);$$;
revoke all on function public.ops_live_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ops_live_session_active(uuid,uuid) to service_role;

