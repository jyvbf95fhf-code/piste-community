-- PROPOSED ONLY. Target: Supabase V2 shnwqdkiapgcftbnhilh. Separate approval required.
-- Adds only private code tables/functions and a wrapper preserving existing Admin commands.
-- No Auth schema/data modification, no existing RLS changes, no destructive migration.
begin;
create schema v2_premium_private;
revoke all on schema v2_premium_private from public,anon,authenticated;
grant usage on schema v2_premium_private to service_role;
create table v2_premium_private.codes (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),
 suffix text not null check(length(suffix)=4),label text not null default '' check(length(label)<=80),
 duration text not null check(duration in ('1_month','3_months','1_year','permanent')),
 max_uses integer not null check(max_uses between 1 and 100000),enabled boolean not null default true,
 expires_at timestamptz,created_at timestamptz not null default now(),created_by uuid not null,
 updated_at timestamptz not null default now()
);
create table v2_premium_private.redemptions (
 id uuid primary key default gen_random_uuid(),code_id uuid not null references v2_premium_private.codes(id),
 member_id uuid not null,granted_at timestamptz not null default now(),expires_at timestamptz,revoked_at timestamptz,
 unique(code_id,member_id)
);
create index premium_code_member on v2_premium_private.redemptions(member_id,granted_at desc);
create table v2_premium_private.attempts (member_id uuid primary key,window_start timestamptz not null,count integer not null);
create table v2_premium_private.events (
 id bigint generated always as identity primary key,actor_id uuid not null,action text not null,
 code_id uuid not null references v2_premium_private.codes(id),member_id uuid,created_at timestamptz not null default now()
);
alter table v2_premium_private.codes enable row level security;
alter table v2_premium_private.redemptions enable row level security;
alter table v2_premium_private.attempts enable row level security;
alter table v2_premium_private.events enable row level security;
revoke all on all tables in schema v2_premium_private from public,anon,authenticated,service_role;
revoke all on all sequences in schema v2_premium_private from public,anon,authenticated,service_role;

create function v2_premium_private.code_expiry(p_duration text,p_now timestamptz)
returns timestamptz language plpgsql security invoker set search_path='' set timezone='UTC' as $$
begin
 case p_duration when '1_month' then return p_now+interval '1 month'; when '3_months' then return p_now+interval '3 months'; when '1_year' then return p_now+interval '1 year'; when 'permanent' then return null; else raise exception 'invalid_duration' using errcode='22023';end case;
end $$;

create function v2_premium_private.entitlement(p_actor uuid)
returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('entitlement','premium','source','access_code','source_id',r.code_id,'granted_at',r.granted_at,'expires_at',r.expires_at,'revoked_at',null)
 from v2_premium_private.redemptions r join public.coaching_remote_users p on p.id=r.member_id
 where r.member_id=p_actor and p.enabled=true and r.revoked_at is null and r.granted_at<=clock_timestamp() and (r.expires_at is null or r.expires_at>clock_timestamp())
 order by r.expires_at desc nulls first,r.granted_at desc limit 1
$$;

create function v2_premium_private.catalog(p_actor uuid,p_action text,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare rec v2_premium_private.codes;created boolean;rows jsonb;history jsonb;grants jsonb;page integer;hpage integer;
begin
 perform pg_advisory_xact_lock(175205,5);
 if not exists(select 1 from auth.users u join public.coaching_remote_users p on p.id=u.id where u.id=p_actor and p.enabled=true and u.raw_app_meta_data->>'admin_role'='owner_admin') then raise exception 'owner_required' using errcode='42501';end if;
 if p_action='create' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'confirmation_required' using errcode='22023';end if;
  if p_payload->>'expires_at' is not null and (p_payload->>'expires_at')::timestamptz<=now() then raise exception 'invalid_expiration' using errcode='22023';end if;
  insert into v2_premium_private.codes(request_id,code_hash,suffix,label,duration,max_uses,expires_at,created_by)
   values((p_payload->>'request_id')::uuid,p_payload->>'code_hash',p_payload->>'suffix',coalesce(p_payload->>'label',''),p_payload->>'duration',(p_payload->>'max_uses')::integer,(p_payload->>'expires_at')::timestamptz,p_actor)
   on conflict(request_id) do nothing returning * into rec;
  created=found;
  if not created then select * into rec from v2_premium_private.codes where request_id=(p_payload->>'request_id')::uuid;end if;
  if created then insert into v2_premium_private.events(actor_id,action,code_id) values(p_actor,'code_created',rec.id);end if;
  return jsonb_build_object('id',rec.id,'created',created);
 elsif p_action='set-enabled' then
  if p_payload->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' then raise exception 'confirmation_required' using errcode='22023';end if;
  select * into rec from v2_premium_private.codes where id=p_id for update;
  if not found then raise exception 'code_not_found' using errcode='22023';end if;
  update v2_premium_private.codes set enabled=(p_payload->>'enabled')::boolean,updated_at=now() where id=p_id;
  insert into v2_premium_private.events(actor_id,action,code_id) values(p_actor,case when (p_payload->>'enabled')::boolean then 'code_enabled' else 'code_disabled' end,p_id);
  return jsonb_build_object('ok',true);
 elsif p_action<>'list' or p_action is null then raise exception 'unsupported_code_action' using errcode='22023';end if;
 page=greatest(0,least(100000,coalesce((p_payload->>'page')::integer,0)));hpage=greatest(0,least(100000,coalesce((p_payload->>'history_page')::integer,0)));
 select coalesce(jsonb_agg(to_jsonb(t)),'[]') into rows from (
  select c.id,c.suffix,c.label,c.duration,c.max_uses,c.enabled,c.created_at,c.created_by,c.expires_at,
   (select count(*) from v2_premium_private.redemptions r where r.code_id=c.id) as uses_count,
   c.max_uses-(select count(*) from v2_premium_private.redemptions r where r.code_id=c.id) as remaining_uses,
   case when not c.enabled then 'inactive' when c.expires_at<=now() then 'expired' when (select count(*) from v2_premium_private.redemptions r where r.code_id=c.id)>=c.max_uses then 'exhausted' else 'active' end as status
  from v2_premium_private.codes c order by c.created_at desc,c.id limit 50 offset page*50
 ) t;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]') into history from (
  select e.id,e.actor_id,e.action,e.code_id,e.member_id,e.created_at,c.suffix,c.label,r.expires_at
  from v2_premium_private.events e join v2_premium_private.codes c on c.id=e.code_id
  left join v2_premium_private.redemptions r on r.code_id=e.code_id and r.member_id=e.member_id
  order by e.id desc limit 50 offset hpage*50
 ) t;
 select coalesce(jsonb_object_agg(t.member_id,t.grant),'{}') into grants from (
  select distinct r.member_id,v2_premium_private.entitlement(r.member_id) as grant from v2_premium_private.redemptions r
 ) t where t.grant is not null;
 return jsonb_build_object('gift_codes_version',1,'codes',rows,'history',history,'member_grants',grants,'page',page,'history_page',hpage,'total',(select count(*) from v2_premium_private.codes),'history_total',(select count(*) from v2_premium_private.events));
end $$;

create function v2_premium_private.redeem(p_actor uuid,p_hash text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare tries integer;rec v2_premium_private.codes;expiry timestamptz;v_now timestamptz;
begin
 -- Serialize account suspension with activation. Identity originates only from verified Edge auth.
 perform 1 from public.coaching_remote_users where id=p_actor and enabled=true for share;
 if not found then return jsonb_build_object('ok',false,'reason','account_disabled');end if;
 insert into v2_premium_private.attempts(member_id,window_start,count) values(p_actor,now(),1)
 on conflict(member_id) do update set count=case when v2_premium_private.attempts.window_start<=now()-interval '15 minutes' then 1 else least(6,v2_premium_private.attempts.count+1) end,
 window_start=case when v2_premium_private.attempts.window_start<=now()-interval '15 minutes' then now() else v2_premium_private.attempts.window_start end
 returning count into tries;
 if tries>5 then return jsonb_build_object('ok',false,'reason','rate_limited');end if;
 select * into rec from v2_premium_private.codes where code_hash=p_hash for update;
 if not found then return jsonb_build_object('ok',false,'reason','invalid_code');end if;
 if exists(select 1 from v2_premium_private.redemptions where code_id=rec.id and member_id=p_actor) then return jsonb_build_object('ok',false,'reason','already_used');end if;
 v_now=clock_timestamp();
 if not rec.enabled or rec.expires_at<=v_now or (select count(*) from v2_premium_private.redemptions where code_id=rec.id)>=rec.max_uses then return jsonb_build_object('ok',false,'reason','invalid_code');end if;
 expiry=v2_premium_private.code_expiry(rec.duration,v_now);
 insert into v2_premium_private.redemptions(code_id,member_id,granted_at,expires_at) values(rec.id,p_actor,v_now,expiry);
 insert into v2_premium_private.events(actor_id,action,code_id,member_id) values(p_actor,'code_redeemed',rec.id,p_actor);
 return jsonb_build_object('ok',true,'entitlement',v2_premium_private.entitlement(p_actor));
end $$;

-- Preserve the existing command and its owner checks; add revocation of code grants atomically.
create function v2_premium_private.member_command(p_actor uuid,p_action text,p_target uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 -- Same target-row ordering as redemption to avoid races with a global revocation.
 perform 1 from public.coaching_remote_users where id=p_target for update;
 result=v2_admin_private.command(p_actor,p_action,p_target,p_payload);
 if p_action='revoke-premium' then
  with removed as (update v2_premium_private.redemptions set revoked_at=now() where member_id=p_target and revoked_at is null returning code_id)
  insert into v2_premium_private.events(actor_id,action,code_id,member_id) select p_actor,'code_grant_revoked',code_id,p_target from removed;
 end if;
 return result;
end $$;
create or replace function public.v2_admin_command(p_actor uuid,p_action text,p_target uuid,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$select v2_premium_private.member_command(p_actor,p_action,p_target,p_payload)$$;
create function public.v2_premium_codes_admin(p_actor uuid,p_action text,p_code_id uuid,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$select v2_premium_private.catalog(p_actor,p_action,p_code_id,p_payload)$$;
create function public.v2_premium_code_redeem(p_actor uuid,p_hash text)
returns jsonb language sql security invoker set search_path='' as $$select v2_premium_private.redeem(p_actor,p_hash)$$;
create function public.v2_premium_code_entitlement(p_actor uuid)
returns jsonb language sql security invoker set search_path='' as $$select v2_premium_private.entitlement(p_actor)$$;
revoke all on all functions in schema v2_premium_private from public,anon,authenticated,service_role;
grant execute on function v2_premium_private.catalog(uuid,text,uuid,jsonb),v2_premium_private.redeem(uuid,text),v2_premium_private.entitlement(uuid),v2_premium_private.member_command(uuid,text,uuid,jsonb) to service_role;
revoke all on function public.v2_premium_codes_admin(uuid,text,uuid,jsonb),public.v2_premium_code_redeem(uuid,text),public.v2_premium_code_entitlement(uuid),public.v2_admin_command(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.v2_premium_codes_admin(uuid,text,uuid,jsonb),public.v2_premium_code_redeem(uuid,text),public.v2_premium_code_entitlement(uuid),public.v2_admin_command(uuid,text,uuid,jsonb) to service_role;
commit;
