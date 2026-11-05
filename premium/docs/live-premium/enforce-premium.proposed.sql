-- PISTE V2 only. Apply atomically after review; no user data or existing grants rewritten.
begin;
create or replace function private.live_valid_premium_record(r jsonb) returns boolean
language plpgsql stable set search_path='' as $$
begin
 if r is null or r->>'entitlement' is distinct from 'premium' or r->>'status' in ('expired','revoked','inactive') or nullif(r->>'revoked_at','') is not null then return false; end if;
 if nullif(r->>'granted_at','') is null or not isfinite((r->>'granted_at')::timestamptz) or (r->>'granted_at')::timestamptz>statement_timestamp() then return false;end if;
 return nullif(r->>'expires_at','') is null or (isfinite((r->>'expires_at')::timestamptz) and (r->>'expires_at')::timestamptz>statement_timestamp());
exception when invalid_datetime_format or datetime_field_overflow then return false;
end $$;
create or replace function private.live_has_premium(p_actor uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare m jsonb;r jsonb;
begin
 if p_actor is null or not exists(select 1 from public.coaching_remote_users where id=p_actor and enabled) then return false;end if;
 select raw_app_meta_data into m from auth.users where id=p_actor;
 if m->>'admin_role'='owner_admin' then return true;end if;
 r=m->'premium_entitlement';
 if r->>'source' in ('premium','admin_grant','access_code') and private.live_valid_premium_record(r) then return true;end if;
 r=m->'premium_gift';
 if r->>'source'='gift' and private.live_valid_premium_record(r) then return true;end if;
 r=public.v2_premium_code_entitlement(p_actor);
 return coalesce(r->>'source'='access_code' and private.live_valid_premium_record(r),false);
end $$;
revoke all on function private.live_valid_premium_record(jsonb),private.live_has_premium(uuid) from public,anon,authenticated;
grant execute on function private.live_has_premium(uuid) to service_role;
-- Extend current functions in place, preserving signatures and existing execute grants.
-- Abort on an unexpected baseline instead of silently omitting a gate.
do $$
declare f regprocedure;old text;next text;definition text;
begin
 f='public.ops_live_authorized(uuid,uuid)'::regprocedure;select prosrc into old from pg_proc where oid=f;
 next=replace(old,'where p.id=p_id and','where private.live_has_premium(p_actor) and private.live_has_premium(p.owner_id) and p.id=p_id and');
 if next=old then raise exception 'unexpected ops_live_authorized baseline';end if;
 execute replace(pg_get_functiondef(f),old,next);
 f='public.ops_live_commit(uuid,uuid,uuid,bigint,text,jsonb)'::regprocedure;select prosrc into old from pg_proc where oid=f;
 next=replace(old,'begin'||chr(10), 'begin'||chr(10)||' if p_type not in (''stop-sharing'',''close'',''revoke'',''retention'',''mark-notification-read'') and not private.live_has_premium(p_actor) then raise exception ''premium_required'' using errcode=''42501'';end if;'||chr(10));
 if next=old then raise exception 'unexpected ops_live_commit baseline';end if;
 execute replace(pg_get_functiondef(f),old,next);
 f='public.ops_live_prepare(uuid,uuid)'::regprocedure;select prosrc into old from pg_proc where oid=f;
 next=replace(old,'begin'||chr(10),'begin'||chr(10)||' if not private.live_has_premium(p_actor) then raise exception ''premium_required'' using errcode=''42501'';end if;'||chr(10));
 if next=old then raise exception 'unexpected ops_live_prepare baseline';end if;
 execute replace(pg_get_functiondef(f),old,next);
 f='public.community_live_sessions(uuid,uuid)'::regprocedure;select prosrc into old from pg_proc where oid=f;
 next=replace(old,'where (p_session_id is null','where private.live_has_premium(p_actor) and private.live_has_premium(s.owner_id) and (p_session_id is null');
 if next=old then raise exception 'unexpected community_live_sessions baseline';end if;
 execute replace(pg_get_functiondef(f),old,next);
 f='private.ops_live_can_listen(text)'::regprocedure;select prosrc into old from pg_proc where oid=f;
 next=replace(old,'where p.sharing','where private.live_has_premium(auth.uid()) and private.live_has_premium(p.owner_id) and p.sharing');
 if next=old then raise exception 'unexpected realtime baseline';end if;
 execute replace(pg_get_functiondef(f),old,next);
 -- Invitations and notifications contain no GPS but are Live surfaces as well.
 foreach f in array array['public.ops_live_pending_invites(uuid)'::regprocedure,'public.ops_live_notifications(uuid)'::regprocedure] loop
  select prosrc into old from pg_proc where oid=f;
  if (select lanname from pg_language join pg_proc on pg_proc.prolang=pg_language.oid where pg_proc.oid=f)<>'sql' then raise exception 'unexpected SQL function baseline';end if;
  next='select case when private.live_has_premium(p_actor) then ('||regexp_replace(old,'[;[:space:]]+$','')||') else ''[]''::jsonb end;';
  execute replace(pg_get_functiondef(f),old,next);
 end loop;
end $$;
-- Ownership-only control header permits withdrawal after loss of access, without GPS or metadata.
create or replace function public.ops_live_head(p_id uuid,p_actor uuid) returns jsonb
language sql set search_path='' as $$
 select case when p.owner_id=p_actor and not private.live_has_premium(p_actor)
 then jsonb_build_object('id',p.id,'version',p.version,'generation',p.generation,'closed',p.closed_at is not null,'lastSequence',p.last_sequence)
 else public.ops_live_read(p_id,p_actor,p.last_sequence,p.version) end
 from public.ops_live_publications p where p.id=p_id and
 (public.ops_live_authorized(p.id,p_actor) or
  (p.owner_id=p_actor and p.purged_at is null and coalesce(p.purge_at,p.active_deadline)>statement_timestamp()));
$$;
commit;
