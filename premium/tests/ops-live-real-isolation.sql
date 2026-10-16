-- V2 DEVELOPMENT ONLY. Existing test identities; no Auth writes, no retained GPS.
begin;
create temporary table ops_qa_accounts as select id from public.coaching_remote_users where enabled order by id limit 3;
grant select on ops_qa_accounts to service_role;
set local role service_role;
do $$
declare users uuid[]; a uuid; b uuid; c uuid; p uuid=gen_random_uuid(); cmd uuid=gen_random_uuid(); v bigint; r jsonb; epoch uuid; baseline jsonb; token text=repeat('a',64); stamp timestamptz=statement_timestamp();
begin
 select array_agg(id order by id) into users from ops_qa_accounts;
 if cardinality(users)<>3 then raise exception 'Three existing enabled accounts required'; end if;
 a=users[1];b=users[2];c=users[3];
 perform public.ops_live_habitual(a,a,b,true);
 r=public.ops_live_commit(p,a,cmd,-1,'publish',jsonb_build_object('localMissionId','qa-ops-'||p,'creationPurpose','create','creationExpectedVersion',-1,'creationExpiresAt',stamp+interval '4 minutes','captureStartedAt',stamp-interval '1 minute','options',jsonb_build_object('showDog',true,'showHandler',false,'showEvents',false,'showTrackAge',true,'showCorridor',true),'metadata',jsonb_build_object('state','En cours','dogName','QA','handlerName','NOT OBSERVABLE','trackingSeconds',0)));
 if not public.ops_live_authorized(p,b) or public.ops_live_authorized(p,c) then raise exception 'habitual isolation';end if;
 r=public.ops_live_read(p,b);if r->'metadata' ? 'handlerName' then raise exception 'sensitive projection';end if;
 begin perform public.ops_live_read(p,c);raise exception 'UNEXPECTED third-party read';exception when insufficient_privilege then null;end;
 begin perform public.ops_live_commit(p,b,gen_random_uuid(),0,'close','{}');raise exception 'UNEXPECTED observer write';exception when insufficient_privilege then null;end;
 begin perform public.ops_live_commit(p,a,gen_random_uuid(),0,'update','{"metadata":{"dossier":"secret"}}');raise exception 'UNEXPECTED dossier';exception when invalid_parameter_value then null;end;
 cmd=gen_random_uuid();
 r=public.ops_live_commit(p,a,cmd,0,'gps-batch',jsonb_build_object('generation',1,'points',jsonb_build_array(jsonb_build_object('sequence',1,'segmentId','s1','latitude',48,'longitude',7,'accuracy',5,'capturedAt',stamp-interval '30 seconds'),jsonb_build_object('sequence',2,'segmentId','s1','latitude',48.0001,'longitude',7,'accuracy',5,'capturedAt',stamp-interval '25 seconds'),jsonb_build_object('sequence',3,'segmentId','s2','latitude',49,'longitude',8,'accuracy',5,'capturedAt',stamp-interval '1 second'))));
 if (select distance_m not between 10 and 12 from public.ops_live_publications where id=p) then raise exception 'gap distance';end if;
 -- Retries are covered by the identical payload fingerprint, and duplicate sequence is atomic.
 begin perform public.ops_live_commit(p,a,gen_random_uuid(),1,'gps-batch',jsonb_build_object('generation',1,'points',jsonb_build_array(jsonb_build_object('sequence',3,'segmentId','s2','latitude',49,'longitude',8,'accuracy',5,'capturedAt',stamp))));raise exception 'UNEXPECTED duplicate';exception when invalid_parameter_value then null;end;
 r=public.ops_live_commit(p,a,gen_random_uuid(),1,'invite',jsonb_build_object('recipientId',c,'tokenHash',token,'expiresAt',stamp+interval '1 hour'));
 if jsonb_array_length(public.ops_live_pending_invites(c))<>1 or jsonb_array_length(public.ops_live_pending_invites(b))<>0 then raise exception 'nominative inbox';end if;
 r=public.ops_live_accept_invite(p,c,gen_random_uuid());
 if not public.ops_live_authorized(p,c) then raise exception 'invitation';end if;
 begin perform public.ops_live_commit(p,c,gen_random_uuid(),3,'join',jsonb_build_object('tokenHash',token));raise exception 'UNEXPECTED reused invite';exception when insufficient_privilege then null;end;
 select channel_epoch into epoch from public.ops_live_publications where id=p;
 r=public.ops_live_commit(p,a,gen_random_uuid(),3,'revoke',jsonb_build_object('userId',c));
 if public.ops_live_authorized(p,c) or (select channel_epoch=epoch from public.ops_live_publications where id=p) then raise exception 'revocation';end if;
 r=public.ops_live_commit(p,a,gen_random_uuid(),4,'close','{}');
 if not (public.ops_live_read(p,b)->>'closed')::boolean then raise exception 'closed snapshot';end if;
 begin perform public.ops_live_commit(p,a,gen_random_uuid(),5,'gps-batch','{"generation":1,"points":[]}');raise exception 'UNEXPECTED late GPS';exception when invalid_parameter_value then null;end;
 if (select purge_at<>closed_at+interval '7 days' or active_deadline<>created_at+interval '24 hours' from public.ops_live_publications where id=p) then raise exception 'retention';end if;
 perform public.ops_live_delete(p,a);
 if exists(select 1 from public.ops_live_points where publication_id=p) or exists(select 1 from public.ops_live_publications where id=p and (projection_metadata<>'{}' or distance_m<>0 or last_position_at is not null or sharing)) then raise exception 'delete/tombstone';end if;
 begin perform public.ops_live_read(p,a);raise exception 'UNEXPECTED restored content';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$begin
 if exists(select 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname like 'ops_live_%' and t.relkind='r' and not t.relrowsecurity) then raise exception 'RLS missing';end if;
 if has_table_privilege('authenticated','public.ops_live_points','select') or has_table_privilege('anon','public.ops_live_publications','select') or has_function_privilege('authenticated','public.ops_live_commit(uuid,uuid,uuid,bigint,text,jsonb)','execute') then raise exception 'raw access';end if;
end $$;
rollback;
select 'PASS: real V2 PostgreSQL, existing accounts, isolation/invite/revoke/GPS/close/retention/delete/raw privileges; all test writes rolled back' as result;
