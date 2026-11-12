do $test$
declare
 a uuid; b uuid; v bigint; code text; r public.v2_personal_records; s public.coaching_remote_sessions;
 expected_code constant text := 'PT409'; tid uuid;
begin
 select f.user_low,f.user_high,f.version into a,b,v from public.community_friendships f
 where status='accepted' and exists(select 1 from public.coaching_remote_users where id=f.user_low and enabled)
 and exists(select 1 from public.coaching_remote_users where id=f.user_high and enabled) limit 1;
 if a is null then raise exception 'Missing contact regression fixture'; end if;
 begin perform public.community_friendship_command(a,b,'remove-contact',gen_random_uuid(),v+1,null);
 exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from expected_code then raise exception 'friendship expected PT409, got %',code; end if;
 code:=null;
 begin perform public.community_social_command(a,b,'set-contact-permission',gen_random_uuid(),v+1,true,'live_access_authorized');
 exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from expected_code then raise exception 'social expected PT409, got %',code; end if;

 select * into r from public.v2_personal_records where kind='track' and exists(select 1 from public.coaching_remote_users where id=owner_id and enabled) limit 1;
 if r.id is null then raise exception 'Missing track fixture'; end if;
 code:=null;
 begin perform public.v2_history_action(r.owner_id,'track:'||r.id,'delete',r.revision+1,false);
 exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from expected_code then raise exception 'history track expected PT409, got %',code; end if;

 select * into s from public.coaching_remote_sessions where state#>>'{search,phase}' in ('DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED')
 and exists(select 1 from public.coaching_remote_users where id=owner_id and enabled) limit 1;
 if s.id is null then raise exception 'Missing coaching fixture'; end if;
 code:=null;
 begin perform public.v2_history_action(s.owner_id,'coaching:'||s.id,'delete',s.version+1,false);
 exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from expected_code then raise exception 'history coaching expected PT409, got %',code; end if;

 -- Every synthetic backup and attempted insert is rolled back in its own subtransaction.
 begin
  tid:=gen_random_uuid();r.id:=tid;
  insert into private.v2_history_backups(owner_id,item_key,snapshot) values(r.owner_id,'track:'||tid,'{}');
  code:=null;
  begin insert into public.v2_personal_records select r.*;
  exception when others then get stacked diagnostics code=returned_sqlstate; end;
  if code is distinct from expected_code then raise exception 'record resurrection expected PT409, got %',code; end if;
  raise sqlstate 'ZT001';
 exception when sqlstate 'ZT001' then null; end;

 begin
  tid:=gen_random_uuid();s.id:=tid;
  insert into private.v2_history_backups(owner_id,item_key,snapshot) values(s.owner_id,'coaching:'||tid,'{}');
  code:=null;
  begin insert into public.coaching_remote_sessions select s.*;
  exception when others then get stacked diagnostics code=returned_sqlstate; end;
  if code is distinct from expected_code then raise exception 'session resurrection expected PT409, got %',code; end if;
  raise sqlstate 'ZT001';
 exception when sqlstate 'ZT001' then null; end;

 begin
  tid:=gen_random_uuid();r.id:=gen_random_uuid();r.kind:='session-dog-link';r.payload:=jsonb_build_object('sessionId',tid);
  insert into private.v2_history_backups(owner_id,item_key,snapshot) values(r.owner_id,'coaching:'||tid,'{}');
  code:=null;
  begin insert into public.v2_personal_records select r.*;
  exception when others then get stacked diagnostics code=returned_sqlstate; end;
  if code is distinct from expected_code then raise exception 'link resurrection expected PT409, got %',code; end if;
  raise sqlstate 'ZT001';
 exception when sqlstate 'ZT001' then null; end;

 code:=null;
 begin perform public.community_friendship_command(gen_random_uuid(),b,'remove-contact',gen_random_uuid(),v,null);
 exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from '42501' then raise exception 'contact authorization changed: %',code; end if;
 code:=null;
 begin perform public.v2_history_action(gen_random_uuid(),'track:'||r.id,'delete',0,false);
 exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from '42501' then raise exception 'history authorization changed: %',code; end if;
end $test$;