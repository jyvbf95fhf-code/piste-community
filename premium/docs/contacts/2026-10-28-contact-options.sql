begin;
set local lock_timeout='5s';
alter table public.community_friendships add column request_live boolean not null default true,add column request_coaching boolean not null default true;
create function public.community_contact_command(p_actor uuid,p_peer uuid,p_action text,p_command_id uuid,p_expected bigint,p_live boolean default true,p_coaching boolean default true) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior public.community_social_commands;finger jsonb;answer jsonb;r public.community_friendships;requester uuid;begin
 perform private.community_require_actor(p_actor);
 if p_actor=p_peer or p_peer is null or p_command_id is null or p_expected is null or p_expected< -1 or p_live is null or p_coaching is null or p_action is null or p_action not in ('contact-request','accept-contact') then raise exception 'invalid_contact_options' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('community-actor:'||p_actor::text,0));
 finger:=jsonb_build_array('contact-options-v1',p_peer,p_action,p_expected,p_live,p_coaching);
 select * into prior from public.community_social_commands where command_id=p_command_id;
 if found then if prior.actor_id<>p_actor or prior.fingerprint<>finger then raise exception 'command_reused' using errcode='22023';end if;return prior.result;end if;
 perform private.community_lock_pair(p_actor,p_peer);
 answer:=public.community_social_command(p_actor,p_peer,p_action,gen_random_uuid(),p_expected,null,null);
 select * into r from public.community_friendships where user_low=least(p_actor,p_peer) and user_high=greatest(p_actor,p_peer) for update;
 if p_action='contact-request' then
  update public.community_friendships set request_live=p_live,request_coaching=p_coaching where id=r.id;
 else
  requester:=r.requested_by;
  -- No access is granted while pending. Apply each person's own choices atomically on acceptance.
  update public.community_friendships set low_quick_coaching=case when user_low=p_actor then p_coaching else r.request_coaching end,high_quick_coaching=case when user_high=p_actor then p_coaching else r.request_coaching end where id=r.id;
  perform public.ops_live_habitual(requester,requester,p_actor,r.request_live);
  perform public.ops_live_habitual(p_actor,p_actor,p_peer,p_live);
 end if;
 insert into public.community_social_commands values(p_command_id,p_actor,finger,answer);return answer;
end $$;
revoke all on function public.community_contact_command(uuid,uuid,text,uuid,bigint,boolean,boolean) from public,anon,authenticated;
grant execute on function public.community_contact_command(uuid,uuid,text,uuid,bigint,boolean,boolean) to service_role;
commit;
