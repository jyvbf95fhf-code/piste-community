begin;
set local lock_timeout='5s';

create or replace function public.community_feed_refresh_session_map(p_actor uuid,p_attachment jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 updated_rows integer;
 new_map jsonb := p_attachment->'fields'->'map';
begin
 perform private.community_require_actor(p_actor);
 perform pg_advisory_xact_lock(hashtextextended('community-feed:'||p_actor::text,0));

 -- Refresh the map of an existing automatic share. Keep moderation state,
 -- author, audience, post ID, comments, and reactions.
 update public.community_feed_posts p
 set publication=jsonb_set(p.publication,'{attachment}',
   jsonb_set(p.publication->'attachment','{fields,map}',
     coalesce(p.publication->'attachment'->'fields'->'map','{}'::jsonb) ||
     (new_map - 'segments') ||
     case when jsonb_array_length(new_map->'segments')>0
       then jsonb_build_object('segments',new_map->'segments') else '{}'::jsonb end
   ) || case when p_attachment ? 'role' then jsonb_build_object('role',p_attachment->'role') else '{}'::jsonb end)
 where p.author_id=p_actor and not p.deleted
   and p.publication->>'visibility'='contacts' and p.publication->>'text'=''
   and p.publication->'attachment'->>'type'='session'
   and p.publication->'attachment'->>'sourceId'=p_attachment->>'sourceId'
   and (p_attachment->>'sourceId' like 'coaching:%' or p_attachment->>'sourceId' like 'ops:%')
   and p.publication->'attachment'->'fields'->'map'->>'coordinateSpace'='wgs84';
 get diagnostics updated_rows=row_count;
 return jsonb_build_object('updated',updated_rows>0);
end $$;

revoke all on function public.community_feed_refresh_session_map(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.community_feed_refresh_session_map(uuid,jsonb) to service_role;
commit;
