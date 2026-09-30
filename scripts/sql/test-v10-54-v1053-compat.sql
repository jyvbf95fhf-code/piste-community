-- Dynamic regression for the V10.53 role/phase matrix and historical NULL mode.
-- Production already permits the legacy Solo member in the two matching
-- phases; V10.54 preserves that compatibility while requiring an explicit
-- solo_mode for all new V10.54 creations.
\set ON_ERROR_STOP on
insert into public.friendships(requester,addressee,status)
values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','accepted')
on conflict do nothing;
reset role;
select set_config('piste.people_creation','on',false);
insert into public.coaching_sessions(owner_id,name,status,workflow_version,visibility_version,phase,laying_mode,traceur_mode,blind_mode,visibility_mode,invite_code)
values('00000000-0000-0000-0000-000000000001','V10.53 normal','live',2,3,'laying','traceur','connected','normal','all','NORMAL53001') returning id \gset normal_
insert into public.coaching_members(session_id,user_id,role,invitation_status)
values(:'normal_id','00000000-0000-0000-0000-000000000001','driver','accepted'),
      (:'normal_id','00000000-0000-0000-0000-000000000002','traceur','accepted');
select set_config('piste.people_creation','off',false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
insert into public.coaching_trace_points(session_id,owner_id,lat,lon) values(:'normal_id',auth.uid(),48.7,2.7);
select private.assert_true('V10.53 Traceur laying point allowed',(select count(*)=1 from public.coaching_trace_points where session_id=:'normal_id'));
select private.assert_raises('V10.53 Traceur live table refused',format('insert into public.coaching_live_points(session_id,owner_id,lat,lon) values (%L,%L,48.7,2.7)',:'normal_id',auth.uid()));
reset role;
select set_config('piste.v1040_transition','on',false);
update public.coaching_sessions set phase='driver_running' where id=:'normal_id';
select set_config('piste.v1040_transition','off',false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.coaching_live_points(session_id,owner_id,lat,lon) values(:'normal_id',auth.uid(),48.8,2.8);
select private.assert_true('V10.53 Driver running point allowed',(select count(*)=1 from public.coaching_live_points where session_id=:'normal_id'));
select private.assert_raises('V10.53 Driver trace table refused',format('insert into public.coaching_trace_points(session_id,owner_id,lat,lon) values (%L,%L,48.8,2.8)',:'normal_id',auth.uid()));
reset role;
select set_config('piste.people_creation','on',false);
insert into public.coaching_sessions(owner_id,name,status,workflow_version,visibility_version,phase,laying_mode,traceur_mode,blind_mode,visibility_mode,invite_code)
values('00000000-0000-0000-0000-000000000001','V10.53 historical Solo','live',2,3,'laying','traceur','connected','normal','all','SOLO53001') returning id \gset old_solo_
insert into public.coaching_members(session_id,user_id,role,invitation_status)
values(:'old_solo_id','00000000-0000-0000-0000-000000000001','solo','accepted');
select set_config('piste.people_creation','off',false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.coaching_trace_points(session_id,owner_id,lat,lon)
values(:'old_solo_id',auth.uid(),48.9,2.9);
select private.assert_true('historical NULL Solo legacy pose allowed',
  (select count(*)=1 from public.coaching_trace_points where session_id=:'old_solo_id'));
reset role;
