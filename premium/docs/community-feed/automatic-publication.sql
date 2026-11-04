begin;
set local lock_timeout='5s';
-- Keep the existing command implementation and its authorization/rate limits.
alter function public.community_feed_command(uuid,jsonb) rename to community_feed_command_before_auto;
create function public.community_feed_command(p_actor uuid,p_body jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare existing public.community_feed_posts%rowtype;prior jsonb;cid uuid;pub jsonb;begin
 perform private.community_require_actor(p_actor);
 if p_body->>'action'='create-post' and p_body->'post'->'attachment'->>'type'='session' then
  cid:=(p_body->>'commandId')::uuid;pub:=p_body->'post';
  if cid is null or octet_length(p_body::text)>262144 or pub->>'visibility' not in ('private','contacts','community') then raise exception 'invalid_command' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('community-feed:'||p_actor::text,0));
  select fingerprint into prior from public.community_feed_commands where actor_id=p_actor and command_id=cid;
  if found and prior<>p_body then raise exception 'command_reused' using errcode='22023';end if;
  select * into existing from public.community_feed_posts p where p.author_id=p_actor and p.publication->'attachment'->>'type'='session' and p.publication->'attachment'->>'sourceId'=pub->'attachment'->>'sourceId' order by p.created_at,p.id limit 1 for update;
  if found then
   -- A repeated automatic publication must never revive or widen a private post.
   -- A newly requested private copy restricts the existing post atomically.
   if prior is null and pub->>'visibility'='private' then update public.community_feed_posts set publication=jsonb_set(publication,'{visibility}','"private"'::jsonb) where author_id=p_actor and publication->'attachment'->>'type'='session' and publication->'attachment'->>'sourceId'=pub->'attachment'->>'sourceId';end if;
   insert into public.community_feed_commands values(p_actor,cid,p_body) on conflict do nothing;
   return public.community_feed_snapshot(p_actor)||jsonb_build_object('createdPostId',existing.id);
  end if;
 end if;
 return public.community_feed_command_before_auto(p_actor,p_body);
end $$;
revoke all on function public.community_feed_command(uuid,jsonb),public.community_feed_command_before_auto(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.community_feed_command(uuid,jsonb),public.community_feed_command_before_auto(uuid,jsonb) to service_role;
create index community_feed_session_source on public.community_feed_posts(author_id,(publication->'attachment'->>'sourceId')) where publication->'attachment'->>'type'='session';
commit;
