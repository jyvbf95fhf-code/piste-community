-- Target: Supabase V2 shnwqdkiapgcftbnhilh; SQL controls, not a signed-in HTTP test.
-- Recovered one-off v14 control script. Prefix variables with v_ and qualify columns:
-- the original "where qa" collided with qa uuid[]; code_id was ambiguous too.
-- Only existing enabled QA members are exercised. No personal account, Auth write,
-- DDL, migration or Edge change. All fixtures are rolled back, including on error.
begin;
do $qa$
declare
 v_qa_ids uuid[]; v_result jsonb; v_code_id uuid;
 v_hash text:=repeat(md5(gen_random_uuid()::text),2);
 v_expiring_hash text:=repeat(md5(gen_random_uuid()::text),2);
 v_i integer; v_rights_hash text;
begin
 select array_agg(p.id order by p.id) into v_qa_ids
 from public.coaching_remote_users p join auth.users u on u.id=p.id
 where p.qa=true and p.enabled=true and coalesce(u.raw_app_meta_data->>'admin_role','')='';
 if coalesce(cardinality(v_qa_ids),0)<3 then raise exception 'three_non_admin_QA_accounts_required';end if;
 if exists(select 1 from v2_premium_private.attempts a where a.member_id=any(v_qa_ids))
 or exists(select 1 from v2_premium_private.redemptions r where r.member_id=any(v_qa_ids))
 then raise exception 'QA_accounts_not_clean_stop_without_modifying_them';end if;
 select md5(string_agg(u.id::text||coalesce(u.raw_app_meta_data::text,''),'' order by u.id))
 into v_rights_hash from auth.users u;
 -- Administrative fixture setup; never represents an authenticated member login.
 insert into v2_premium_private.codes(request_id,code_hash,suffix,label,duration,max_uses,created_by)
 values(gen_random_uuid(),v_hash,'QA14','QA SQL control rollback','1_month',1,v_qa_ids[1])
 returning id into v_code_id;
 v_result:=public.v2_premium_code_redeem(v_qa_ids[1],v_hash);
 if v_result->>'ok' is distinct from 'true'
 or v_result->'entitlement'->>'source' is distinct from 'access_code'
 or v_result->'entitlement'->>'entitlement' is distinct from 'premium'
 then raise exception 'activation_failed';end if;
 v_result:=public.v2_premium_code_redeem(v_qa_ids[1],v_hash);
 if v_result->>'reason' is distinct from 'already_used' then raise exception 'reuse_failed';end if;
 v_result:=public.v2_premium_code_redeem(v_qa_ids[2],v_hash);
 if v_result->>'reason' is distinct from 'invalid_code' then raise exception 'quota_failed';end if;
 if (select count(*) from v2_premium_private.redemptions r where r.code_id=v_code_id)<>1
 or (select count(*) from v2_premium_private.events e where e.code_id=v_code_id and e.action='code_redeemed')<>1
 then raise exception 'quota_or_history_failed';end if;
 begin
  perform public.v2_premium_codes_admin(v_qa_ids[2],'list',null,'{}');
  raise exception 'unauthorized_owner_access';
 exception when insufficient_privilege then null;end;
 insert into v2_premium_private.codes(request_id,code_hash,suffix,duration,max_uses,expires_at,created_by)
 values(gen_random_uuid(),v_expiring_hash,'QA14','permanent',1,clock_timestamp()-interval '1 second',v_qa_ids[3]);
 v_result:=public.v2_premium_code_redeem(v_qa_ids[3],v_expiring_hash);
 if v_result->>'reason' is distinct from 'invalid_code' then raise exception 'code_expiration_failed';end if;
 for v_i in 1..5 loop v_result:=public.v2_premium_code_redeem(v_qa_ids[3],repeat('0',64));end loop;
 if v_result->>'reason' is distinct from 'rate_limited' then raise exception 'throttle_failed';end if;
 update v2_premium_private.redemptions r set expires_at=clock_timestamp()-interval '1 second' where r.code_id=v_code_id;
 if public.v2_premium_code_entitlement(v_qa_ids[1]) is not null then raise exception 'grant_expiration_failed';end if;
 if v2_premium_private.code_expiry('1_month','2024-01-31Z') is distinct from '2024-02-29Z'::timestamptz
 or v2_premium_private.code_expiry('3_months','2024-01-31Z') is distinct from '2024-04-30Z'::timestamptz
 or v2_premium_private.code_expiry('1_year','2024-02-29Z') is distinct from '2025-02-28Z'::timestamptz
 or v2_premium_private.code_expiry('permanent',now()) is not null
 then raise exception 'calendar_failed';end if;
 update v2_premium_private.codes c set enabled=false where c.id=v_code_id;
 v_result:=public.v2_premium_code_redeem(v_qa_ids[3],v_hash);
 if v_result->>'reason' is distinct from 'rate_limited' then raise exception 'throttle_bypass';end if;
 if v_rights_hash is distinct from (select md5(string_agg(u.id::text||coalesce(u.raw_app_meta_data::text,''),'' order by u.id)) from auth.users u)
 then raise exception 'existing_rights_modified';end if;
 if exists(select 1 from pg_proc p where p.oid in
 ('public.v2_premium_codes_admin(uuid,text,uuid,jsonb)'::regprocedure,
 'public.v2_premium_code_redeem(uuid,text)'::regprocedure,
 'public.v2_premium_code_entitlement(uuid)'::regprocedure)
 and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE')))
 then raise exception 'browser_rpc_exposed';end if;
end $qa$;
select 'PASS: activation,quota,reuse,history,expiry,calendar,rate_limit,authorization,rights_unchanged; SQL only' as tests;
rollback;
