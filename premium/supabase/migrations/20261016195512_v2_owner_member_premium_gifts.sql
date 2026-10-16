-- PROPOSED ONLY: sensitive privileged SQL; do not apply without the owner's approval.
-- No schema change, no deletion, no RLS modification, no payment integration.
create or replace function v2_admin_private.gift_record(previous jsonb,p_payload jsonb,p_actor uuid,p_now timestamptz)
returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare expiry timestamptz;anchor timestamptz;active boolean;
begin
 if coalesce(p_payload->>'giftDuration','') not in ('1_month','3_months','1_year','permanent') then raise exception 'invalid_gift_duration';end if;
 active=previous->>'entitlement'='premium' and previous->>'source'='gift' and previous->>'revoked_at' is null and (previous->>'granted_at')::timestamptz<=p_now and (previous->>'expires_at' is null or (previous->>'expires_at')::timestamptz>p_now);
 if active and previous->>'expires_at' is null then return previous||jsonb_build_object('last_request_id',p_payload->>'requestId');end if;
 anchor=case when active then greatest(p_now,(previous->>'expires_at')::timestamptz) else p_now end;
 expiry=case p_payload->>'giftDuration' when '1_month' then anchor+interval '1 month' when '3_months' then anchor+interval '3 months' when '1_year' then anchor+interval '1 year' else null end;
 return jsonb_build_object('entitlement','premium','source','gift','source_id',p_actor,'granted_by',p_actor,'granted_at',case when active then (previous->>'granted_at')::timestamptz else p_now end,'last_granted_at',p_now,'expires_at',expiry,'revoked_at',null,'last_request_id',p_payload->>'requestId');
end $$;
revoke all on function v2_admin_private.gift_record(jsonb,jsonb,uuid,timestamptz) from public,anon,authenticated,service_role;

create or replace function v2_admin_private.command(p_actor uuid,p_action text,p_target uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_role text;meta jsonb;before_meta jsonb;grant_record jsonb;expiry timestamptz;days integer;enabled_before boolean;
begin
 -- Serialize rights changes so role removal cannot race another administrator action.
 perform pg_advisory_xact_lock(175205,5);
 select u.raw_app_meta_data->>'admin_role' into actor_role from auth.users u join public.coaching_remote_users p on p.id=u.id where u.id=p_actor and p.enabled=true;
 if actor_role is distinct from 'owner_admin' then raise exception 'not_admin' using errcode='42501';end if;
 if actor_role='readonly_admin' or actor_role='support_admin' and p_action not in ('suspend-account','reactivate-account') then raise exception 'forbidden_action' using errcode='42501';end if;
 if p_action is null or p_action not in ('gift-premium','revoke-gift-premium','grant-premium','revoke-premium','grant-jumolf','revoke-jumolf','assign-scientific-role','revoke-scientific-role','set-admin-role','suspend-account','reactivate-account') then raise exception 'unsupported_admin_action' using errcode='22023';end if;
 select coalesce(raw_app_meta_data,'{}') into meta from auth.users where id=p_target for update;
 select enabled into enabled_before from public.coaching_remote_users where id=p_target for update;
 if meta is null then raise exception 'member_not_found' using errcode='22023';end if;
 if meta->>'admin_role'='owner_admin' then raise exception 'owner_protected' using errcode='42501';end if;
 if coalesce(meta->>'admin_role','') in ('admin','support_admin','readonly_admin') and actor_role<>'owner_admin' then raise exception 'admin_protected' using errcode='42501';end if;
 if p_action in ('gift-premium','revoke-gift-premium','revoke-premium','revoke-jumolf','assign-scientific-role','revoke-scientific-role','set-admin-role','suspend-account','reactivate-account') and p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'confirmation_required' using errcode='22023';end if;
 if p_action in ('gift-premium','revoke-gift-premium','revoke-premium','revoke-jumolf','assign-scientific-role','revoke-scientific-role','set-admin-role','suspend-account') and length(trim(coalesce(p_payload->>'reason','')))<2 then raise exception 'reason_required' using errcode='22023';end if;
 before_meta=meta;
 if p_action='grant-premium' then raise exception 'use_gift_premium' using errcode='22023';end if;
 if p_action='gift-premium' then
  if coalesce(p_payload->>'requestId','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'request_id_required';end if;
  if meta#>>'{premium_gift,last_request_id}'=p_payload->>'requestId' then return jsonb_build_object('ok',true,'duplicate',true);end if;
  meta=jsonb_set(meta,'{premium_gift}',v2_admin_private.gift_record(meta->'premium_gift',p_payload,p_actor,now()));
 elsif p_action='revoke-gift-premium' then
  meta=jsonb_set(meta,'{premium_gift}',coalesce(meta->'premium_gift','{}')||jsonb_build_object('revoked_at',now(),'revoked_by',p_actor));
 elsif p_action in ('grant-jumolf') then
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
  if p_action='revoke-premium' then meta=jsonb_set(meta,'{premium_gift}',coalesce(meta->'premium_gift','{}')||jsonb_build_object('revoked_at',now(),'revoked_by',p_actor));end if;
 elsif p_action in ('assign-scientific-role','revoke-scientific-role') then
  if p_action='assign-scientific-role' and coalesce(p_payload->>'role','') not in ('researcher','scientific_reader') then raise exception 'invalid_scientific_role';end if;
  meta=jsonb_set(meta,'{permissions}',coalesce(meta->'permissions','{}')||jsonb_build_object('research',p_action='assign-scientific-role','research_revoked_at',case when p_action='revoke-scientific-role' then now() else null end,'research_expires_at',null));
  meta=jsonb_set(meta,'{scientific_role}',case when p_action='assign-scientific-role' then p_payload->'role' else 'null'::jsonb end);
 elsif p_action='set-admin-role' then
  if actor_role<>'owner_admin' then raise exception 'owner_required' using errcode='42501';end if;
  if coalesce(p_payload->>'role','') not in ('','admin','support_admin','readonly_admin') then raise exception 'invalid_admin_role';end if;
  meta=jsonb_set(meta,'{admin_role}',coalesce(nullif(p_payload->'role','""'::jsonb),'null'::jsonb));
 elsif p_action in ('suspend-account','reactivate-account') then
  insert into public.coaching_remote_users(id,display_name,qa,enabled) values(p_target,'Membre',false,p_action='reactivate-account') on conflict(id) do update set enabled=excluded.enabled;
 end if;
 update auth.users set raw_app_meta_data=meta where id=p_target;
 insert into v2_admin_private.audit(actor_id,actor_role,action,target_id,reason,before_state,after_state) values(p_actor,actor_role,p_action,p_target,left(coalesce(p_payload->>'reason',p_payload->>'note',''),180),jsonb_build_object('rights',before_meta-'providers'-'provider','enabled',enabled_before),jsonb_build_object('rights',meta-'providers'-'provider','enabled',case when p_action='suspend-account' then false when p_action='reactivate-account' then true else enabled_before end));
 return jsonb_build_object('ok',true);
end $$;
create or replace function v2_admin_private.snapshot(p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_role text;members jsonb;audit_rows jsonb;
begin
 select u.raw_app_meta_data->>'admin_role' into actor_role from auth.users u join public.coaching_remote_users p on p.id=u.id where u.id=p_actor and p.enabled=true;
 if actor_role is distinct from 'owner_admin' then raise exception 'not_admin' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at,'last_access_at',u.last_sign_in_at,'last_data_activity_at',(select max(c.created_at) from public.v2_personal_commands c where c.owner_id=u.id),'name',p.display_name,'enabled',p.enabled,'qa',p.qa,
 'app_metadata',jsonb_build_object('admin_role',u.raw_app_meta_data->'admin_role','permissions',u.raw_app_meta_data->'permissions','scientific_role',u.raw_app_meta_data->'scientific_role','premium_entitlement',u.raw_app_meta_data->'premium_entitlement','premium_gift',u.raw_app_meta_data->'premium_gift','jumolf_entitlement',u.raw_app_meta_data->'jumolf_entitlement'),
 'dog_count',(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='dog' and r.deleted_at is null),
 'profile_count',(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='profile' and r.deleted_at is null),
 'session_count',(select count(*) from public.coaching_remote_sessions s where s.owner_id=u.id)+(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='ops' and r.deleted_at is null),
 'track_count',(select count(*) from public.v2_personal_records r where r.owner_id=u.id and r.kind='track' and r.deleted_at is null)
 ) order by u.created_at),'[]') into members from auth.users u left join public.coaching_remote_users p on p.id=u.id;
 select coalesce(jsonb_agg(to_jsonb(a)-'before_state'-'after_state' order by a.timestamp),'[]') into audit_rows from (select * from v2_admin_private.audit order by timestamp desc limit 200) a;
 return jsonb_build_object('members',members,'audit',audit_rows,'role',actor_role,'member_management_version',2,'generated_at',now());
end $$;
