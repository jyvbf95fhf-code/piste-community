begin;
create or replace function public.community_live_sessions(p_actor uuid,p_session_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform private.community_require_actor(p_actor);
 return coalesce((select jsonb_agg(q.projection order by q.updated_at desc,q.id) from (
  select s.id,s.updated_at,case when terminal.ended then
   jsonb_build_object('id',s.id,'status','ended','ended',true,'owner_id',case when s.state->'session'->>'mode'='full_blind' then null else s.owner_id end)
   else jsonb_build_object('id',s.id,'owner_id',s.owner_id,'version',s.version,'updated_at',s.updated_at,'state',s.state) end projection
  from public.coaching_remote_sessions s
  join public.coaching_remote_users u on u.id=s.owner_id and u.enabled
  cross join lateral (select (s.state->'liveEndedAt' is not null and s.state->'liveEndedAt'<>'null'::jsonb) or coalesce(s.state->'search'->>'phase' in ('DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED'),false)
   or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(s.state#>'{session,control,departures}')='array' then s.state#>'{session,control,departures}' else '[]'::jsonb end) d where d->>'participantId'=s.owner_id::text) ended) terminal
  where (p_session_id is null or s.id=p_session_id)
   and ((not terminal.ended and s.state->'search'->>'phase' in ('LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING')) or (p_session_id is not null and terminal.ended))
   and (p_session_id is not null or s.owner_id<>p_actor)
   and (s.owner_id=p_actor or exists(select 1 from public.community_friendships f join public.community_social_edges e on e.owner_id=s.owner_id and e.peer_id=p_actor and e.live_enabled where f.user_low=least(s.owner_id,p_actor) and f.user_high=greatest(s.owner_id,p_actor) and f.status='accepted'))
  order by s.updated_at desc,s.id limit 30
 ) q),'[]'::jsonb);
end $$;
revoke all on function public.community_live_sessions(uuid,uuid) from public,anon,authenticated;
grant execute on function public.community_live_sessions(uuid,uuid) to service_role;
create or replace function public.ops_live_list(p_actor uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'generation',p.generation,'closed',p.closed_at is not null,'isOwner',p.owner_id=p_actor,'updatedAt',p.updated_at) order by p.updated_at desc,p.id),'[]'::jsonb)
 from (select p.* from public.ops_live_publications p where public.ops_live_authorized(p.id,p_actor) order by p.updated_at desc,p.id limit 100) p;
$$;
revoke all on function public.ops_live_list(uuid) from public,anon,authenticated;
grant execute on function public.ops_live_list(uuid) to service_role;
commit;
