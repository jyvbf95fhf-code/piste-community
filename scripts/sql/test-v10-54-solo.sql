-- Synthetic, isolated integration test for V10.54 Solo RPC/RLS behavior.
-- psql runs this file with ON_ERROR_STOP=1.

\set ON_ERROR_STOP on
create or replace function private.assert_true(label text, value boolean)
returns void language plpgsql as $$ begin
  if not coalesce(value,false) then raise exception 'FAIL: %',label; end if;
  raise notice 'PASS: %',label;
end $$;
create or replace function private.assert_raises(label text, statement text)
returns void language plpgsql as $$ begin
  begin execute statement; raise exception 'FAIL: % (call unexpectedly succeeded)',label;
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: %',label;
  end;
end $$;
grant execute on function private.assert_true(text,boolean),private.assert_raises(text,text) to authenticated;

insert into auth.users values ('00000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into auth.users values ('00000000-0000-0000-0000-000000000002') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

do $$ declare r jsonb; sid uuid; r2 jsonb; begin
  r:=public.create_coaching_people_session_v1054(null,
    '[{"user_id":"00000000-0000-0000-0000-000000000001","role":"solo"}]'::jsonb,
    'normal','connected','self_trace','solo-test-001');
  sid:=(r->>'id')::uuid;
  perform private.assert_true('self_trace creation',r->>'solo_mode'='self_trace');
  perform private.assert_true('one Solo member',
    (select count(*)=1 from public.coaching_members where session_id=sid and role='solo'));
  r2:=public.create_coaching_people_session_v1054(null,
    '[{"user_id":"00000000-0000-0000-0000-000000000001","role":"solo"}]'::jsonb,
    'normal','connected','self_trace','solo-test-001');
  perform private.assert_true('same idempotency key replays',r2->>'id'=sid::text and (r2->>'idempotent_replay')::boolean);
  perform private.assert_true('idempotency count is one',(select count(*)=1 from public.coaching_sessions where solo_creation_key='solo-test-001'));
  r2:=public.create_coaching_people_session_v1054(null,
    '[{"user_id":"00000000-0000-0000-0000-000000000001","role":"solo"}]'::jsonb,
    'normal','connected','self_trace','solo-test-002');
  perform private.assert_true('different idempotency key creates distinct session',r2->>'id'<>sid::text);
  perform public.start_solo_laying_v1054(sid);
  perform private.assert_true('phase laying',(select phase='laying' and status='live' from public.coaching_sessions where id=sid));
  insert into public.coaching_trace_points(session_id,owner_id,lat,lon) values(sid,auth.uid(),48.1,2.1);
  perform private.assert_true('pose point allowed',(select count(*)=1 from public.coaching_trace_points where session_id=sid));
  perform private.assert_raises('live point forbidden in laying',format('insert into public.coaching_live_points(session_id,owner_id,lat,lon) values (%L,%L,48.1,2.1)',sid,auth.uid()));
  perform public.finish_solo_laying_v1054(sid);
  perform private.assert_true('phase waiting_ready',(select phase='waiting_ready' and status='waiting' from public.coaching_sessions where id=sid));
  perform public.start_solo_driver_run_v1054(sid);
  perform private.assert_true('phase driver_running',(select phase='driver_running' and status='live' from public.coaching_sessions where id=sid));
  insert into public.coaching_live_points(session_id,owner_id,lat,lon) values(sid,auth.uid(),48.2,2.2);
  perform private.assert_true('driver point allowed',(select count(*)=1 from public.coaching_live_points where session_id=sid));
  perform private.assert_raises('pose point forbidden in driver_running',format('insert into public.coaching_trace_points(session_id,owner_id,lat,lon) values (%L,%L,48.3,2.3)',sid,auth.uid()));
  select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
  perform private.assert_raises('non-member cannot write pose',format('insert into public.coaching_trace_points(session_id,owner_id,lat,lon) values (%L,%L,48.6,2.6)',sid,auth.uid()));
  select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
  perform public.finish_solo_run_v1054(sid);
  perform private.assert_true('session finished',(select status='ended' or debrief_status in ('track_finished','in_progress','closed') from public.coaching_sessions where id=sid));
  perform private.assert_true('pose and driver traces separated',(select count(*)=1 from public.coaching_trace_points where session_id=sid) and (select count(*)=1 from public.coaching_live_points where session_id=sid));
end $$;

do $$ declare r jsonb; sid uuid; begin
  r:=public.create_coaching_people_session_v1054(null,
    '[{"user_id":"00000000-0000-0000-0000-000000000001","role":"solo"}]'::jsonb,
    'normal','external','external_traceur','solo-external-001');
  sid:=(r->>'id')::uuid;
  perform private.assert_true('external creation',(r->>'solo_mode')='external_traceur');
  perform private.assert_true('external has no Traceur member',(select count(*)=0 from public.coaching_members where session_id=sid and role='traceur'));
  perform private.assert_raises('external cannot write pose',format('insert into public.coaching_trace_points(session_id,owner_id,lat,lon) values (%L,%L,48.4,2.4)',sid,auth.uid()));
  perform public.mark_external_traceur_ready_v1054(sid,'immediate');
  perform public.start_solo_driver_run_v1054(sid);
  insert into public.coaching_live_points(session_id,owner_id,lat,lon) values(sid,auth.uid(),48.5,2.5);
  perform private.assert_true('external driver point allowed',(select count(*)=1 from public.coaching_live_points where session_id=sid));
end $$;

select private.assert_true('V10.53 creation RPC remains present',to_regprocedure('public.create_coaching_people_session_v1053(uuid,jsonb,text,text)') is not null);
select private.assert_true('authenticated can execute V10.54',has_function_privilege('authenticated','public.create_coaching_people_session_v1054(uuid,jsonb,text,text,text,text)','execute'));
select private.assert_true('anon cannot execute V10.54',not has_function_privilege('anon','public.create_coaching_people_session_v1054(uuid,jsonb,text,text,text,text)','execute'));
reset role;
