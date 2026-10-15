begin;
create schema if not exists private;
create table public.coaching_remote_users (id uuid primary key references auth.users(id), display_name text not null check(length(display_name) between 1 and 80), qa boolean not null default true, enabled boolean not null default true);
create table public.coaching_remote_sessions (id uuid primary key, owner_id uuid not null references auth.users(id), version bigint not null default 0, state jsonb not null, updated_at timestamptz not null default now());
create index coaching_remote_sessions_owner on public.coaching_remote_sessions(owner_id);
create table public.coaching_remote_commands (session_id uuid not null references public.coaching_remote_sessions(id), command_id uuid not null, actor_id uuid not null, fingerprint text not null, accepted_version bigint not null, primary key(session_id, command_id));
create table public.coaching_remote_invites (token_hash text primary key, session_id uuid not null references public.coaching_remote_sessions(id), role text not null check(role in ('traceur','driver','coach','observer')), consumed_by uuid, expires_at timestamptz not null default now()+interval '1 day');
create index coaching_remote_invites_session on public.coaching_remote_invites(session_id);
create table public.coaching_remote_batches (session_id uuid not null references public.coaching_remote_sessions(id), actor_id uuid not null, batch_id uuid not null, kind text not null check(kind in ('pose','search')), primary key(session_id,actor_id,batch_id));
create table public.coaching_remote_points (session_id uuid not null references public.coaching_remote_sessions(id), actor_id uuid not null, kind text not null, sequence bigint not null, segment_id text not null, point jsonb not null, server_received_at timestamptz not null default now(), primary key(session_id,actor_id,kind,sequence));
create table public.coaching_remote_bootstrap (token_hash text primary key, consumed boolean not null default false);
do $$ declare t text; begin foreach t in array array['users','sessions','commands','invites','batches','points','bootstrap'] loop execute format('alter table public.coaching_remote_%I enable row level security',t); execute format('revoke all on public.coaching_remote_%I from anon, authenticated',t); execute format('grant all on public.coaching_remote_%I to service_role',t); end loop; end $$;
create function public.coaching_claim_bootstrap(p_hash text) returns boolean language sql security invoker set search_path='' as $$ with claimed as (update public.coaching_remote_bootstrap set consumed=true where token_hash=p_hash and not consumed returning 1) select exists(select 1 from claimed); $$;
revoke all on function public.coaching_claim_bootstrap(text) from public,anon,authenticated;
grant execute on function public.coaching_claim_bootstrap(text) to service_role;
create function public.coaching_commit(p_session_id uuid,p_actor_id uuid,p_command_id uuid,p_fingerprint text,p_expected bigint,p_state jsonb,p_invite text default null,p_batch jsonb default null) returns bigint language plpgsql security invoker set search_path='' as $$
declare current_row public.coaching_remote_sessions; previous public.coaching_remote_commands; invite public.coaching_remote_invites; point jsonb; begin
 if not exists(select 1 from public.coaching_remote_users where id=p_actor_id and enabled) then raise exception 'access_denied' using errcode='42501'; end if;
 if p_expected=-1 then
  insert into public.coaching_remote_sessions(id,owner_id,version,state) values(p_session_id,p_actor_id,0,p_state) on conflict do nothing;
 end if;
 select * into current_row from public.coaching_remote_sessions where id=p_session_id for update;
 if not found then raise exception 'session_not_found' using errcode='42501'; end if;
 select * into previous from public.coaching_remote_commands where session_id=p_session_id and command_id=p_command_id;
 if found then
  if previous.actor_id<>p_actor_id or previous.fingerprint<>p_fingerprint then raise exception 'command_reused' using errcode='22023'; end if;
  return previous.accepted_version;
 end if;
 if current_row.version<>greatest(p_expected,0) then raise exception 'version_conflict' using errcode='40001'; end if;
 if p_expected=-1 and (current_row.owner_id<>p_actor_id or current_row.state<>p_state) then raise exception 'session_exists' using errcode='40001'; end if;
 if p_invite is not null then
  select * into invite from public.coaching_remote_invites where token_hash=p_invite and session_id=p_session_id for update;
  if not found or invite.consumed_by is not null or invite.expires_at<=now() then raise exception 'invite_invalid' using errcode='42501'; end if;
  update public.coaching_remote_invites set consumed_by=p_actor_id where token_hash=p_invite;
 elsif not (current_row.state->'members' @> jsonb_build_array(jsonb_build_object('id',p_actor_id::text))) then raise exception 'not_member' using errcode='42501'; end if;
 if p_batch is not null then
  insert into public.coaching_remote_batches(session_id,actor_id,batch_id,kind) values(p_session_id,p_actor_id,p_command_id,p_batch->>'kind');
  for point in select value from jsonb_array_elements(p_batch->'points') loop
   insert into public.coaching_remote_points(session_id,actor_id,kind,sequence,segment_id,point) values(p_session_id,p_actor_id,p_batch->>'kind',(point->>'sequence')::bigint,point->>'segmentId',point);
  end loop;
 end if;
 update public.coaching_remote_sessions set state=p_state, version=(p_state->>'version')::bigint,updated_at=now() where id=p_session_id;
 insert into public.coaching_remote_commands values(p_session_id,p_command_id,p_actor_id,p_fingerprint,(p_state->>'version')::bigint);
 for point in select value from jsonb_array_elements(p_state->'members') loop
  perform realtime.send(jsonb_build_object('sessionId',p_session_id,'version',p_state->'version'),'version','coaching:'||p_session_id::text||':'||(point->>'id'),true);
 end loop;
 return (p_state->>'version')::bigint;
end $$;
revoke all on function public.coaching_commit(uuid,uuid,uuid,text,bigint,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.coaching_commit(uuid,uuid,uuid,text,bigint,jsonb,text,jsonb) to service_role;
create function private.coaching_can_listen(topic text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.coaching_remote_users u where u.id=auth.uid() and u.enabled) and exists(select 1 from public.coaching_remote_sessions s where topic='coaching:'||s.id::text||':'||auth.uid()::text and s.state->'members' @> jsonb_build_array(jsonb_build_object('id',auth.uid()::text)));
$$;
revoke all on function private.coaching_can_listen(text) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.coaching_can_listen(text) to authenticated;
create policy coaching_private_versions on realtime.messages for select to authenticated using (extension='broadcast' and private.coaching_can_listen(realtime.topic()));
commit;
