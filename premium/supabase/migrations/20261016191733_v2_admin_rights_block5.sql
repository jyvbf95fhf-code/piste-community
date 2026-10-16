-- V2 only. Additive administration, no changes to existing RLS or account data.
create schema v2_admin_private;
revoke all on schema v2_admin_private from public,anon,authenticated;
grant usage on schema v2_admin_private to service_role;
create table v2_admin_private.audit(
 event_id uuid primary key default gen_random_uuid(),timestamp timestamptz not null default now(),
 actor_id uuid not null,actor_role text not null,action text not null,target_id uuid not null,
 reason text not null,before_state jsonb not null,after_state jsonb not null
);
alter table v2_admin_private.audit enable row level security;
revoke all on v2_admin_private.audit from public,anon,authenticated,service_role;
create function v2_admin_private.command(p_actor uuid,p_action text,p_target uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_role text;meta jsonb;before_meta jsonb;grant_record jsonb;expiry timestamptz;days integer;enabled_before boolean;
begin
 -- Serialize rights changes so role removal cannot race another administrator action.
 perform pg_advisory_xact_lock(175205,5);
 select u.raw_app_meta_data->>'admin_role' into actor_role from auth.users u join public.coaching_remote_users p on p.id=u.id where u.id=p_actor and p.enabled=true;
 if actor_role is null or actor_role not in ('owner_admin','admin','support_admin','readonly_admin') then raise exception 'not_admin' using errcode='42501';end if;
 if actor_role='readonly_admin' or actor_role='support_admin' and p_action not in ('suspend-account','reactivate-account') then raise exception 'forbidden_action' using errcode='42501';end if;
 if p_action is null or p_action not in ('grant-premium','revoke-premium','grant-jumolf','revoke-jumolf','assign-scientific-role','revoke-scientific-role','set-admin-role','suspend-account','reactivate-account') then raise exception 'unsupported_admin_action' using errcode='22023';end if;
 select coalesce(raw_app_meta_data,'{}') into meta from auth.users where id=p_target for update;
 select enabled into enabled_before from public.coaching_remote_users where id=p_target for update;
 if meta is null or enabled_before is null then raise exception 'member_not_found' using errcode='22023';end if;
 if meta->>'admin_role'='owner_admin' then raise exception 'owner_protected' using errcode='42501';end if;
 if coalesce(meta->>'admin_role','') in ('admin','support_admin','readonly_admin') and actor_role<>'owner_admin' then raise exception 'admin_protected' using errcode='42501';end if;
 if p_action in ('revoke-premium','revoke-jumolf','assign-scientific-role','revoke-scientific-role','set-admin-role','suspend-account','reactivate-account') and p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'confirmation_required' using errcode='22023';end if;
 if p_action in ('revoke-premium','revoke-jumolf','assign-scientific-role','revoke-scientific-role','set-admin-role','suspend-account') and length(trim(coalesce(p_payload->>'reason','')))<2 then raise exception 'reason_required' using errcode='22023';end if;
 before_meta=meta;
 if p_action in ('grant-premium','grant-jumolf') then
  if p_payload->>'duration'='custom' then
   expiry=(p_payload->>'expiresAt')::timestamptz;if expiry is null then raise exception 'custom_expiration_required';end if;
  elsif p_payload->>'durationDays' is not null then
   days=(p_payload->>'durationDays')::integer;if days<1 or days>3650 then raise exception 'invalid_duration';end if;expiry=now()+days*interval '1 day';
  end if;
  if expiry is not null and expiry<=now() then raise exception 'invalid_expiration';end if;
  grant_record=jsonb_build_object('entitlement',case when p_action='grant-premium' then 'premium' else 'admin_grant' end,'source','admin_grant','source_id',p_actor,'granted_at',now(),'expires_at',expiry,'revoked_at',null);
  meta=jsonb_set(meta,array[case when p_action='grant-premium' then 'premium_entitlement' else 'jumolf_entitlement' end],grant_record);
 elsif p_action in ('revoke-premium','revoke-jumolf') then
  meta=jsonb_set(meta,array[case when p_action='revoke-premium' then 'premium_entitlement' else 'jumolf_entitlement' end],coalesce(meta->case when p_action='revoke-premium' then 'premium_entitlement' else 'jumolf_entitlement' end,'{}')||jsonb_build_object('revoked_at',now()));
 elsif p_action in ('assign-scientific-role','revoke-scientific-role') then
  if p_action='assign-scientific-role' and coalesce(p_payload->>'role','') not in ('researcher','scientific_reader') then raise exception 'invalid_scientific_role';end if;
  meta=jsonb_set(meta,'{permissions}',coalesce(meta->'permissions','{}')||jsonb_build_object('research',p_action='assign-scientific-role','research_revoked_at',case when p_action='revoke-scientific-role' then now() else null end,'research_expires_at',null));
  meta=jsonb_set(meta,'{scientific_role}',case when p_action='assign-scientific-role' then p_payload->'role' else 'null'::jsonb end);
 elsif p_action='set-admin-role' then
  if actor_role<>'owner_admin' then raise exception 'owner_required' using errcode='42501';end if;
  if coalesce(p_payload->>'role','') not in ('','admin','support_admin','readonly_admin') then raise exception 'invalid_admin_role';end if;
  meta=jsonb_set(meta,'{admin_role}',coalesce(nullif(p_payload->'role','""'::jsonb),'null'::jsonb));
 elsif p_action in ('suspend-account','reactivate-account') then
  update public.coaching_remote_users set enabled=(p_action='reactivate-account') where id=p_target;
 end if;
 update auth.users set raw_app_meta_data=meta where id=p_target;
 insert into v2_admin_private.audit(actor_id,actor_role,action,target_id,reason,before_state,after_state) values(p_actor,actor_role,p_action,p_target,left(coalesce(p_payload->>'reason',p_payload->>'note',''),180),jsonb_build_object('rights',before_meta-'providers'-'provider','enabled',enabled_before),jsonb_build_object('rights',meta-'providers'-'provider','enabled',case when p_action='suspend-account' then false when p_action='reactivate-account' then true else enabled_before end));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function v2_admin_private.command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function v2_admin_private.command(uuid,text,uuid,jsonb) to service_role;
create function public.v2_admin_command(p_actor uuid,p_action text,p_target uuid,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$select v2_admin_private.command(p_actor,p_action,p_target,p_payload)$$;
revoke all on function public.v2_admin_command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.v2_admin_command(uuid,text,uuid,jsonb) to service_role;

create function v2_admin_private.snapshot(p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_role text;members jsonb;audit_rows jsonb;
begin
 select u.raw_app_meta_data->>'admin_role' into actor_role from auth.users u join public.coaching_remote_users p on p.id=u.id where u.id=p_actor and p.enabled=true;
 if actor_role is null or actor_role not in ('owner_admin','admin','support_admin','readonly_admin') then raise exception 'not_admin' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at,'last_access_at',u.last_sign_in_at,'name',p.display_name,'enabled',p.enabled,'qa',p.qa,
 'app_metadata',jsonb_build_object('admin_role',u.raw_app_meta_data->'admin_role','permissions',u.raw_app_meta_data->'permissions','scientific_role',u.raw_app_meta_data->'scientific_role','premium_entitlement',u.raw_app_meta_data->'premium_entitlement','jumolf_entitlement',u.raw_app_meta_data->'jumolf_entitlement'),
 'dog_count',(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='dog' and r.deleted_at is null),
 'profile_count',(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='profile' and r.deleted_at is null),
 'session_count',(select count(*) from public.coaching_remote_sessions s where s.owner_id=u.id)+(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='ops' and r.deleted_at is null),
 'track_count',(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='track' and r.deleted_at is null)
 ) order by u.created_at),'[]') into members from auth.users u left join public.coaching_remote_users p on p.id=u.id;
 select coalesce(jsonb_agg(to_jsonb(a)-'before_state'-'after_state' order by a.timestamp),'[]') into audit_rows from (select * from v2_admin_private.audit order by timestamp desc limit 200) a;
 return jsonb_build_object('members',members,'audit',audit_rows,'role',actor_role,'generated_at',now());
end $$;
revoke all on function v2_admin_private.snapshot(uuid) from public,anon,authenticated;
grant execute on function v2_admin_private.snapshot(uuid) to service_role;
create function public.v2_admin_snapshot(p_actor uuid) returns jsonb language sql security invoker set search_path='' as $$select v2_admin_private.snapshot(p_actor)$$;
revoke all on function public.v2_admin_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.v2_admin_snapshot(uuid) to service_role;
