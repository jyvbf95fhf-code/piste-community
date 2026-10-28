-- Additive. Requires installed community friendships and OPS Live V2. Service role only.
begin;
set local lock_timeout='5s';
create table public.community_social_edges(owner_id uuid references public.coaching_remote_users(id),peer_id uuid references public.coaching_remote_users(id),following boolean not null default false,live_enabled boolean not null default true,primary key(owner_id,peer_id),check(owner_id<>peer_id));
alter table public.community_social_edges enable row level security;
revoke all on public.community_social_edges from public,anon,authenticated;
grant select,insert,update on public.community_social_edges to service_role;
-- Keep the legacy habitual Live checkbox authoritative for accepted friends too.
create function private.community_social_habitual_sync() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.scope='habitual' then
  update public.community_social_edges e set live_enabled=(new.revoked_at is null)
  where e.owner_id=new.owner_id and e.peer_id=new.user_id
   and exists(select 1 from public.community_friendships f where f.user_low=least(new.owner_id,new.user_id) and f.user_high=greatest(new.owner_id,new.user_id) and f.status='accepted');
 end if;
 return new;
end $$;
revoke all on function private.community_social_habitual_sync() from public,anon,authenticated;
grant execute on function private.community_social_habitual_sync() to service_role;
create trigger community_social_habitual_sync after insert or update on public.ops_live_access for each row execute function private.community_social_habitual_sync();
create function private.community_social_defaults() returns trigger language plpgsql security invoker set search_path='' as $$
declare a uuid;b uuid;begin
 if new.status='accepted' and (tg_op='INSERT' or old.status is distinct from 'accepted') then
  foreach a in array array[new.user_low,new.user_high] loop
   b:=case when a=new.user_low then new.user_high else new.user_low end;
   insert into public.community_social_edges(owner_id,peer_id,live_enabled) values(a,b,not exists(select 1 from public.ops_live_access where owner_id=a and user_id=b and scope='habitual' and revoked_at is not null)) on conflict do nothing;
   -- A habitual withdrawal may have happened after an earlier follow created the edge.
   update public.community_social_edges set live_enabled=false where owner_id=a and peer_id=b and exists(select 1 from public.ops_live_access where owner_id=a and user_id=b and scope='habitual' and revoked_at is not null);
   -- Existing revoked habitual permissions are deliberate; never reopen them implicitly.
   if exists(select 1 from public.community_social_edges where owner_id=a and peer_id=b and live_enabled) and not exists(select 1 from public.ops_live_access where owner_id=a and user_id=b and scope='habitual') then perform public.ops_live_habitual(a,a,b,true);end if;
  end loop;
 elsif tg_op='UPDATE' and old.status='accepted' and new.status<>'accepted' then
  update public.community_social_edges set live_enabled=false where (owner_id=new.user_low and peer_id=new.user_high) or (owner_id=new.user_high and peer_id=new.user_low);
  perform public.ops_live_habitual(new.user_low,new.user_low,new.user_high,false);
  perform public.ops_live_habitual(new.user_high,new.user_high,new.user_low,false);
 end if;
 return new;
end $$;
create trigger community_social_defaults before insert or update on public.community_friendships for each row execute function private.community_social_defaults();
-- One-time Live defaults for accepted pairs. Invitation permissions remain unchanged.
insert into public.community_social_edges(owner_id,peer_id,live_enabled) select p.owner_id,p.peer_id,not exists(select 1 from public.ops_live_access a where a.owner_id=p.owner_id and a.user_id=p.peer_id and a.scope='habitual' and a.revoked_at is not null) from (select user_low owner_id,user_high peer_id from public.community_friendships where status='accepted' union all select user_high,user_low from public.community_friendships where status='accepted') p on conflict do nothing;
do $$ declare e record;begin for e in select * from public.community_social_edges loop if e.live_enabled and not exists(select 1 from public.ops_live_access where owner_id=e.owner_id and user_id=e.peer_id and scope='habitual') then perform public.ops_live_habitual(e.owner_id,e.owner_id,e.peer_id,true);end if;end loop;end $$;
create function public.community_social_snapshot(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare base jsonb;begin
 base:=public.community_friendship_snapshot(p_actor);
 return base||jsonb_build_object('socialVersion',1,'following',coalesce((select jsonb_agg(peer_id order by peer_id) from public.community_social_edges where owner_id=p_actor and following),'[]'::jsonb),'livePermissions',coalesce((select jsonb_agg(jsonb_build_object('peerId',e.peer_id,'enabled',e.live_enabled) order by e.peer_id) from public.community_social_edges e join public.community_friendships f on f.user_low=least(e.owner_id,e.peer_id) and f.user_high=greatest(e.owner_id,e.peer_id) and f.status='accepted' where e.owner_id=p_actor),'[]'::jsonb));
end $$;
create table public.community_social_commands(command_id uuid primary key,actor_id uuid not null,fingerprint jsonb not null,result jsonb not null);
alter table public.community_social_commands enable row level security;
revoke all on public.community_social_commands from public,anon,authenticated;
grant select,insert on public.community_social_commands to service_role;
create function public.community_social_command(p_actor uuid,p_peer uuid,p_action text,p_command_id uuid,p_expected bigint,p_enabled boolean default null,p_permission text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior public.community_social_commands;finger jsonb;answer jsonb;r public.community_friendships;begin
 perform private.community_require_actor(p_actor);
 if p_actor=p_peer or p_peer is null or p_command_id is null or p_expected is null or p_expected< -1 then raise exception 'invalid_command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('community-actor:'||p_actor::text,0));
 finger:=jsonb_build_array(p_peer,p_action,p_expected,p_enabled,p_permission);
 select * into prior from public.community_social_commands where command_id=p_command_id;
 if found then if prior.actor_id<>p_actor or prior.fingerprint<>finger then raise exception 'command_reused' using errcode='22023';end if;return prior.result;end if;
 perform private.community_lock_pair(p_actor,p_peer);
 if not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'peer_denied' using errcode='42501';end if;
 select * into r from public.community_friendships where user_low=least(p_actor,p_peer) and user_high=greatest(p_actor,p_peer) for update;
 if p_action in ('follow','unfollow') then
  insert into public.community_social_edges(owner_id,peer_id,following,live_enabled) values(p_actor,p_peer,p_action='follow',not exists(select 1 from public.ops_live_access where owner_id=p_actor and user_id=p_peer and scope='habitual' and revoked_at is not null)) on conflict(owner_id,peer_id) do update set following=excluded.following;
  answer:=jsonb_build_object('peerId',p_peer,'following',p_action='follow','version',coalesce(r.version,-1));
 elsif p_action='set-contact-permission' and p_permission='live_access_authorized' then
  if r.status is distinct from 'accepted' then raise exception 'friend_required' using errcode='42501';end if;
  if r.version<>p_expected then raise exception 'version_conflict' using errcode='40001';end if;
  if p_enabled is null then raise exception 'enabled_required' using errcode='22023';end if;
  update public.community_social_edges set live_enabled=p_enabled where owner_id=p_actor and peer_id=p_peer;
  perform public.ops_live_habitual(p_actor,p_actor,p_peer,p_enabled);
  update public.community_friendships set version=version+1,updated_at=now() where id=r.id returning * into r;
  answer:=jsonb_build_object('peerId',p_peer,'status',r.status,'version',r.version);
 else
  if p_action='set-contact-permission' and p_permission is distinct from 'quick_coaching_invite_authorized' then raise exception 'permission_invalid' using errcode='22023';end if;
  answer:=public.community_friendship_command(p_actor,p_peer,p_action,p_command_id,p_expected,p_enabled);
 end if;
 insert into public.community_social_commands values(p_command_id,p_actor,finger,answer);return answer;
end $$;
create function public.community_member_search(p_actor uuid,p_query text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform private.community_require_actor(p_actor);
 if length(trim(p_query))<2 or length(p_query)>100 then raise exception 'query_invalid' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'displayName',q.display_name)) from (select id,display_name from public.coaching_remote_users where enabled and id<>p_actor and (id::text=trim(p_query) or strpos(lower(display_name),lower(trim(p_query)))>0) order by display_name,id limit 30) q),'[]'::jsonb);end $$;
create function public.community_live_sessions(p_actor uuid,p_session_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform private.community_require_actor(p_actor);
 -- Re-evaluate friendship, enabled accounts, and owner-directed permission on every read.
 return coalesce((select jsonb_agg(to_jsonb(q)) from (select s.id,s.owner_id,s.version,s.updated_at,s.state from public.coaching_remote_sessions s join public.coaching_remote_users u on u.id=s.owner_id and u.enabled where (p_session_id is null or s.id=p_session_id) and s.state->'search'->>'phase' in ('PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING') and (s.owner_id=p_actor or exists(select 1 from public.community_friendships f join public.community_social_edges e on e.owner_id=s.owner_id and e.peer_id=p_actor and e.live_enabled where f.user_low=least(s.owner_id,p_actor) and f.user_high=greatest(s.owner_id,p_actor) and f.status='accepted')) order by s.updated_at desc,s.id limit 30) q),'[]'::jsonb);
end $$;
revoke all on function private.community_social_defaults(),public.community_social_snapshot(uuid),public.community_social_command(uuid,uuid,text,uuid,bigint,boolean,text),public.community_member_search(uuid,text),public.community_live_sessions(uuid,uuid) from public,anon,authenticated;
grant execute on function private.community_social_defaults(),public.community_social_snapshot(uuid),public.community_social_command(uuid,uuid,text,uuid,bigint,boolean,text),public.community_member_search(uuid,text),public.community_live_sessions(uuid,uuid) to service_role;
commit;
