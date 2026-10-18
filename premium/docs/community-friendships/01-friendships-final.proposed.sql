-- SQL FINAL PROPOSÉ — AUCUNE AUTORISATION D’APPLICATION À CE STADE.
-- Projet exclusif : shnwqdkiapgcftbnhilh. Ne pas appliquer séparément l’ancien 01-targeted-invites.
-- Additif, transactionnel, désactivé à l’installation ; aucune modification Auth/OPS/Premium.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$ begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='coaching_remote_invites' and c.relrowsecurity) then
  raise exception 'coaching_invites_RLS_required';
 end if;
 if has_table_privilege('anon','public.coaching_remote_invites','INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.coaching_remote_invites','INSERT,UPDATE,DELETE') then
  raise exception 'unexpected_client_write_grants';
 end if;
end $$;
alter table public.coaching_remote_invites
 add column recipient_id uuid references public.coaching_remote_users(id),
 add constraint coaching_invite_recipient_consumption check(recipient_id is null or consumed_by is null or consumed_by=recipient_id);
create index coaching_remote_invites_recipient on public.coaching_remote_invites(session_id,recipient_id) where recipient_id is not null and consumed_by is null;
create function private.coaching_keep_invite_recipient() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if old.recipient_id is not null and new.recipient_id is distinct from old.recipient_id then
  raise exception 'invite_recipient_immutable' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.coaching_keep_invite_recipient() from public,anon,authenticated;
create trigger coaching_keep_invite_recipient before update on public.coaching_remote_invites
 for each row execute function private.coaching_keep_invite_recipient();

create table public.community_friendships(
 id uuid not null unique default gen_random_uuid(),
 user_low uuid not null references public.coaching_remote_users(id),
 user_high uuid not null references public.coaching_remote_users(id),
 requested_by uuid not null references public.coaching_remote_users(id),
 status text not null default 'pending' check(status in ('pending','accepted','refused','cancelled','removed')),
 requested_at timestamptz not null default now(),resolved_at timestamptz,accepted_at timestamptz,
 low_quick_coaching boolean not null default false,high_quick_coaching boolean not null default false,
 version bigint not null default 0 check(version>=0),updated_at timestamptz not null default now(),
 primary key(user_low,user_high),
 check(user_low<user_high),check(requested_by in (user_low,user_high)),
 check((status='pending')=(resolved_at is null)),
 check(status<>'accepted' or accepted_at is not null),
 check(status='accepted' or (not low_quick_coaching and not high_quick_coaching))
);
create index community_friendships_high on public.community_friendships(user_high,status);
create index community_friendships_low on public.community_friendships(user_low,status);
create table public.community_friendship_events(
 command_id uuid primary key,actor_id uuid not null references public.coaching_remote_users(id),
 peer_id uuid not null references public.coaching_remote_users(id),
 action text not null check(action in ('contact-request','accept-contact','refuse-contact','cancel-contact','remove-contact','set-contact-permission')),
 expected_version bigint not null,enabled_value boolean,
 resulting_version bigint not null,result jsonb not null,created_at timestamptz not null default now()
);
create index community_friendship_events_actor on public.community_friendship_events(actor_id,created_at);
create table private.community_friendship_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into private.community_friendship_control values(true,false);
alter table public.community_friendships enable row level security;
alter table public.community_friendship_events enable row level security;
alter table private.community_friendship_control enable row level security;
revoke all on public.community_friendships,public.community_friendship_events,private.community_friendship_control from public,anon,authenticated;
grant select,insert,update on public.community_friendships to service_role;
grant select,insert on public.community_friendship_events to service_role;
grant select,update on private.community_friendship_control to service_role;
grant usage on schema private to service_role;

create function private.community_require_actor(p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare active boolean;begin
 select enabled into active from private.community_friendship_control where singleton for share;
 if active is distinct from true then raise exception 'friendships_disabled' using errcode='55000';end if;
 if not exists(select 1 from public.coaching_remote_users where id=p_actor and enabled) then
  raise exception 'actor_denied' using errcode='42501';end if;
end $$;
create function private.community_lock_pair(p_a uuid,p_b uuid) returns void
language sql security invoker set search_path='' as $$
 select pg_advisory_xact_lock(hashtextextended('community:'||least(p_a,p_b)::text||':'||greatest(p_a,p_b)::text,0));
$$;
create function public.community_friendship_command(p_actor uuid,p_peer uuid,p_action text,p_command_id uuid,p_expected bigint,p_enabled boolean default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare lo uuid:=least(p_actor,p_peer);hi uuid:=greatest(p_actor,p_peer);r public.community_friendships;
 previous public.community_friendship_events;answer jsonb;begin
 perform private.community_require_actor(p_actor);
 if p_peer is null or p_peer=p_actor or p_command_id is null or p_expected is null or p_expected< -1
 or p_action is null or p_action not in ('contact-request','accept-contact','refuse-contact','cancel-contact','remove-contact','set-contact-permission')
 or (p_action='set-contact-permission' and p_enabled is null) or (p_action<>'set-contact-permission' and p_enabled is not null)
 then raise exception 'invalid_command' using errcode='22023';end if;
 -- Actor lock serializes rate-limit and idempotency decisions across pairs; pair lock serializes both parties.
 perform pg_advisory_xact_lock(hashtextextended('community-actor:'||p_actor::text,0));
 select * into previous from public.community_friendship_events where command_id=p_command_id;
 if found then
  if previous.actor_id<>p_actor or previous.peer_id<>p_peer or previous.action<>p_action
   or previous.expected_version<>p_expected or previous.enabled_value is distinct from p_enabled
  then raise exception 'command_reused' using errcode='22023';end if;
  return previous.result;
 end if;
 perform private.community_lock_pair(p_actor,p_peer);
 select * into r from public.community_friendships where user_low=lo and user_high=hi for update;
 if coalesce(r.version,-1)<>p_expected then raise exception 'version_conflict' using errcode='40001';end if;
 if p_action='contact-request' then
  if r.status in ('pending','accepted') then raise exception 'relation_exists' using errcode='22023';end if;
  if not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'contact_unavailable' using errcode='42501';end if;
  if (select count(*) from public.community_friendship_events where actor_id=p_actor and action='contact-request' and created_at>now()-interval '1 hour')>=20 then
   raise exception 'request_rate_limit' using errcode='54000';end if;
  insert into public.community_friendships(user_low,user_high,requested_by)
   values(lo,hi,p_actor) on conflict(user_low,user_high) do update set requested_by=p_actor,status='pending',requested_at=now(),resolved_at=null,accepted_at=null,
    low_quick_coaching=false,high_quick_coaching=false,version=public.community_friendships.version+1,updated_at=now();
 else
  if r.id is null then raise exception 'relation_unavailable' using errcode='42501';end if;
  if p_action in ('accept-contact','refuse-contact') then
   if r.status<>'pending' or r.requested_by=p_actor then raise exception 'recipient_only' using errcode='42501';end if;
   if p_action='accept-contact' and not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'contact_unavailable' using errcode='42501';end if;
   update public.community_friendships set status=case when p_action='accept-contact' then 'accepted' else 'refused' end,
    resolved_at=now(),accepted_at=case when p_action='accept-contact' then now() else null end,
    low_quick_coaching=false,high_quick_coaching=false,version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  elsif p_action='cancel-contact' then
   if r.status<>'pending' or r.requested_by<>p_actor then raise exception 'requester_only' using errcode='42501';end if;
   update public.community_friendships set status='cancelled',resolved_at=now(),version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  elsif p_action='remove-contact' then
   if r.status<>'accepted' then raise exception 'accepted_relation_required' using errcode='42501';end if;
   update public.community_friendships set status='removed',resolved_at=now(),low_quick_coaching=false,high_quick_coaching=false,version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  elsif p_action='set-contact-permission' then
   if r.status<>'accepted' then raise exception 'accepted_relation_required' using errcode='42501';end if;
   if p_enabled and not exists(select 1 from public.coaching_remote_users where id=p_peer and enabled) then raise exception 'contact_unavailable' using errcode='42501';end if;
   update public.community_friendships set
    low_quick_coaching=case when p_actor=lo then p_enabled else low_quick_coaching end,
    high_quick_coaching=case when p_actor=hi then p_enabled else high_quick_coaching end,
    version=version+1,updated_at=now() where user_low=lo and user_high=hi;
  end if;
 end if;
 select * into r from public.community_friendships where user_low=lo and user_high=hi;
 answer:=jsonb_build_object('id',r.id,'peerId',p_peer,'status',r.status,'version',r.version);
 insert into public.community_friendship_events(command_id,actor_id,peer_id,action,expected_version,enabled_value,resulting_version,result)
  values(p_command_id,p_actor,p_peer,p_action,p_expected,p_enabled,r.version,answer);
 return answer;
end $$;

create function public.community_friendship_snapshot(p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare contacts jsonb;received jsonb;sent jsonb;relations jsonb;begin
 perform private.community_require_actor(p_actor);
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',u.display_name,'displayName',u.display_name,'relationshipId',f.id,'version',f.version,
  'quick_coaching_invite_authorized',case when p_actor=f.user_low then f.low_quick_coaching else f.high_quick_coaching end) order by u.display_name,u.id),'[]'::jsonb)
 into contacts from public.community_friendships f join public.coaching_remote_users u on u.id=case when f.user_low=p_actor then f.user_high else f.user_low end and u.enabled
 where (f.user_low=p_actor or f.user_high=p_actor) and f.status='accepted';
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'fromUserId',f.requested_by,'toUserId',p_actor,'name',u.display_name,'status','pending','createdAt',f.requested_at,'version',f.version) order by f.requested_at,f.id),'[]'::jsonb)
 into received from public.community_friendships f join public.coaching_remote_users u on u.id=f.requested_by and u.enabled
 where (f.user_low=p_actor or f.user_high=p_actor) and f.status='pending' and f.requested_by<>p_actor;
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'fromUserId',p_actor,'toUserId',u.id,'name',u.display_name,'status','pending','createdAt',f.requested_at,'version',f.version) order by f.requested_at,f.id),'[]'::jsonb)
 into sent from public.community_friendships f join public.coaching_remote_users u on u.id=case when f.user_low=p_actor then f.user_high else f.user_low end and u.enabled
 where (f.user_low=p_actor or f.user_high=p_actor) and f.status='pending' and f.requested_by=p_actor;
 select coalesce(jsonb_agg(jsonb_build_object('peerId',case when f.user_low=p_actor then f.user_high else f.user_low end,'status',f.status,'version',f.version,'requestedBy',f.requested_by) order by f.user_low,f.user_high),'[]'::jsonb) into relations from public.community_friendships f where f.user_low=p_actor or f.user_high=p_actor;
 return jsonb_build_object('ownerId',p_actor,'version',1,'contacts',contacts,'received',received,'sent',sent,'relations',relations);
end $$;
create function public.community_coaching_contacts(p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare view jsonb;result jsonb;begin
 view:=public.community_friendship_snapshot(p_actor);
 select coalesce(jsonb_agg(jsonb_build_object('id',c->'id','name',c->'name','quick_coaching_invite_authorized',true)),'[]'::jsonb)
 into result from jsonb_array_elements(view->'contacts') c where (c->>'quick_coaching_invite_authorized')::boolean;
 return result;
end $$;

create function private.community_assert_coaching_contact(p_owner uuid,p_recipient uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform private.community_require_actor(p_owner);
 if p_recipient is null or p_owner=p_recipient then raise exception 'contact_denied' using errcode='42501';end if;
 perform private.community_lock_pair(p_owner,p_recipient);
 if not exists(select 1 from public.community_friendships f join public.coaching_remote_users u on u.id=p_recipient and u.enabled
  where f.user_low=least(p_owner,p_recipient) and f.user_high=greatest(p_owner,p_recipient) and f.status='accepted'
   and case when f.user_low=p_owner then f.low_quick_coaching else f.high_quick_coaching end)
 then raise exception 'contact_denied' using errcode='42501';end if;
end $$;
create function private.community_check_pending_team() returns trigger
language plpgsql security invoker set search_path='' as $$
declare item jsonb;recipient uuid;begin
 if new.state ? 'pendingTeam' then
  if jsonb_typeof(new.state->'pendingTeam')<>'array' or jsonb_array_length(new.state->'pendingTeam')>32
   or jsonb_typeof(new.state->'members') is distinct from 'array' or jsonb_array_length(new.state->'members')<>1
   or new.state->'members'->0->>'id' is distinct from new.owner_id::text
  then raise exception 'pending_team_invalid' using errcode='42501';end if;
  for item in select value from jsonb_array_elements(new.state->'pendingTeam') order by least(new.owner_id,(value->>'recipientId')::uuid),greatest(new.owner_id,(value->>'recipientId')::uuid) loop
   if item->>'status' is distinct from 'pending' or item->>'role' is null or item->>'role' not in ('traceur','driver','coach','observer') then raise exception 'pending_team_invalid' using errcode='42501';end if;
   recipient:=(item->>'recipientId')::uuid;
   perform private.community_assert_coaching_contact(new.owner_id,recipient);
  end loop;
 end if;
 return new;
end $$;
create trigger community_check_pending_team before insert on public.coaching_remote_sessions for each row execute function private.community_check_pending_team();
create function private.community_check_targeted_invite() returns trigger
language plpgsql security invoker set search_path='' as $$
declare s public.coaching_remote_sessions;begin
 if new.recipient_id is not null and (tg_op='INSERT' or (old.consumed_by is null and new.consumed_by is not null)) then
  select * into s from public.coaching_remote_sessions where id=new.session_id;
  if s.id is null or s.state->'search'->>'phase' is distinct from 'PREPARATION'
   or not exists(select 1 from jsonb_array_elements(coalesce(s.state->'pendingTeam','[]'::jsonb)) a where a->>'recipientId'=new.recipient_id::text and a->>'role'=new.role and a->>'status'='pending')
  then raise exception 'targeted_invite_denied' using errcode='42501';end if;
  perform private.community_assert_coaching_contact(s.owner_id,new.recipient_id);
 end if;
 return new;
end $$;
create trigger community_check_targeted_invite before insert or update on public.coaching_remote_invites for each row execute function private.community_check_targeted_invite();

revoke all on function private.community_require_actor(uuid),private.community_lock_pair(uuid,uuid),private.community_assert_coaching_contact(uuid,uuid),private.community_check_pending_team(),private.community_check_targeted_invite() from public,anon,authenticated;
grant execute on function private.community_require_actor(uuid),private.community_lock_pair(uuid,uuid),private.community_assert_coaching_contact(uuid,uuid) to service_role;
revoke all on function public.community_friendship_command(uuid,uuid,text,uuid,bigint,boolean),public.community_friendship_snapshot(uuid),public.community_coaching_contacts(uuid) from public,anon,authenticated;
grant execute on function public.community_friendship_command(uuid,uuid,text,uuid,bigint,boolean),public.community_friendship_snapshot(uuid),public.community_coaching_contacts(uuid) to service_role;
commit;
