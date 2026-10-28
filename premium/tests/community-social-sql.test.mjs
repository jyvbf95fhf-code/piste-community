import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',sid='44444444-4444-4444-8444-444444444444';
test('actual PostgreSQL schemas: social defaults, explicit withdrawals, idempotence and revocation',async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create function auth.uid() returns uuid language sql as $$select null::uuid$$;create schema realtime;create table realtime.messages(extension text);create function realtime.topic() returns text language sql as $$select ''::text$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;grant usage on schema realtime to service_role;`);
 for(const p of ['supabase/migrations/20261015054625_coaching_remote_core.sql','docs/community-friendships/01-friendships-final.proposed.sql','supabase/migrations/20261016081506_ops_live_v2.sql'])await db.exec(await readFile(new URL('../'+p,import.meta.url),'utf8'));
 for(const id of [a,b,c]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into coaching_remote_users values($1,$2,true,true)',[id,id===a?'Alpha':'Bravo']);}
 await db.exec('update private.community_friendship_control set enabled=true');
 const rpc=async(name,args)=>{const keys=Object.keys(args);return (await db.query(`select public.${name}(${keys.map((k,i)=>`${k}=>$${i+1}`).join(',')}) result`,Object.values(args))).rows[0].result;};
 const old=(actor,peer,action,v,enabled=null)=>rpc('community_friendship_command',{p_actor:actor,p_peer:peer,p_action:action,p_command_id:crypto.randomUUID(),p_expected:v,p_enabled:enabled});
 await old(a,b,'contact-request',-1);await old(b,a,'accept-contact',0);await rpc('ops_live_habitual',{p_actor:a,p_owner:a,p_user:b,p_enabled:false});
 await db.exec(await readFile(new URL('../docs/social-live/2026-10-28-social-live.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('select revoked_at is not null revoked from ops_live_access where owner_id=$1 and user_id=$2',[a,b])).rows[0].revoked,true);
 const snap=()=>rpc('community_social_snapshot',{p_actor:a});assert.equal((await snap()).contacts[0].quick_coaching_invite_authorized,false);assert.equal((await snap()).livePermissions[0].enabled,false);
 const command=(actor,peer,action,v,enabled=null,permission=null,commandId=crypto.randomUUID())=>rpc('community_social_command',{p_actor:actor,p_peer:peer,p_action:action,p_command_id:commandId,p_expected:v,p_enabled:enabled,p_permission:permission});
 const cmd=crypto.randomUUID();await command(a,b,'follow',1,null,null,cmd);await command(a,b,'follow',1,null,null,cmd);assert.deepEqual((await snap()).following,[b]);await assert.rejects(command(a,b,'unfollow',1,null,null,cmd));await command(a,b,'unfollow',1);assert.deepEqual((await snap()).following,[]);
 await db.query('insert into coaching_remote_sessions(id,owner_id,state) values($1,$2,$3)',[sid,a,{session:{mode:'normal'},search:{phase:'SEARCH_RUNNING'}}]);
 const live=actor=>rpc('community_live_sessions',{p_actor:actor,p_session_id:sid});assert.equal((await live(b)).length,0);assert.equal((await live(c)).length,0);assert.equal((await rpc('community_social_snapshot',{p_actor:b})).livePermissions[0].enabled,true);
 await command(a,b,'set-contact-permission',1,false,'live_access_authorized');assert.equal((await live(b)).length,0);await command(a,b,'set-contact-permission',2,true,'live_access_authorized');assert.equal((await live(b)).length,1);
 await rpc('ops_live_habitual',{p_actor:a,p_owner:a,p_user:b,p_enabled:false});assert.equal((await live(b)).length,0);assert.equal((await snap()).livePermissions.find(p=>p.peerId===b).enabled,false);await rpc('ops_live_habitual',{p_actor:a,p_owner:a,p_user:b,p_enabled:true});assert.equal((await live(b)).length,1);assert.equal((await snap()).livePermissions.find(p=>p.peerId===b).enabled,true);
 await command(a,b,'remove-contact',3);assert.equal((await live(b)).length,0);assert.equal((await db.query('select count(*)::int n from ops_live_access where owner_id in ($1,$2) and user_id in ($1,$2) and revoked_at is null',[a,b])).rows[0].n,0);
 await command(a,b,'contact-request',4);await command(b,a,'accept-contact',5);assert.equal((await live(b)).length,0);assert.equal((await snap()).livePermissions.find(p=>p.peerId===b).enabled,false);await command(a,b,'set-contact-permission',6,true,'live_access_authorized');assert.equal((await live(b)).length,1);
 await rpc('ops_live_habitual',{p_actor:c,p_owner:c,p_user:b,p_enabled:false});await command(c,b,'follow',-1);assert.equal((await rpc('community_social_snapshot',{p_actor:c})).following.includes(b),true);assert.equal((await db.query('select live_enabled from community_social_edges where owner_id=$1 and peer_id=$2',[c,b])).rows[0].live_enabled,false);
 await command(c,b,'unfollow',-1);await command(b,c,'follow',-1);assert.equal((await db.query('select live_enabled from community_social_edges where owner_id=$1 and peer_id=$2',[b,c])).rows[0].live_enabled,true);await rpc('ops_live_habitual',{p_actor:b,p_owner:b,p_user:c,p_enabled:false});await command(b,c,'contact-request',-1);await command(c,b,'accept-contact',0);assert.equal((await db.query('select live_enabled from community_social_edges where owner_id=$1 and peer_id=$2',[b,c])).rows[0].live_enabled,false);assert.equal((await db.query('select revoked_at is not null revoked from ops_live_access where owner_id=$1 and user_id=$2',[b,c])).rows[0].revoked,true);
 await command(a,c,'contact-request',-1);await command(c,a,'accept-contact',0);assert.equal((await live(c)).length,1);assert.equal((await db.query('select revoked_at from ops_live_access where owner_id=$1 and user_id=$2',[a,c])).rows[0].revoked_at,null);
 await command(a,c,'set-contact-permission',1,false,'live_access_authorized');await command(a,c,'remove-contact',2);await command(a,c,'contact-request',3);await command(c,a,'accept-contact',4);assert.equal((await live(c)).length,0);
 assert.equal((await rpc('community_member_search',{p_actor:b,p_query:'Alpha'}))[0].id,a);
 // Additive replacement: retain grants while returning minimal authorized tombstones.
 await db.exec(await readFile(new URL('../docs/live-end/2026-10-28-live-end.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../docs/live-end/2026-10-28-live-activity.sql',import.meta.url),'utf8'));await db.query("update coaching_remote_sessions set state=jsonb_set(state,'{search,phase}','\"PREPARATION\"') where id=$1",[sid]);assert.deepEqual(await live(b),[]);await db.query("update coaching_remote_sessions set state=jsonb_set(state,'{search,phase}','\"SEARCH_RUNNING\"') where id=$1",[sid]);
 await db.query("insert into ops_live_publications(id,owner_id,local_mission_id,sharing,creation_expires_at) values($1,$2,'local-secret',true,now()+interval '1 hour')",[sid,a]);
 await db.query("insert into ops_live_access(owner_id,scope,publication_id,generation,user_id) values($1,'publication',$2,1,$3)",[a,sid,b]);
 const ownerRows=await rpc('ops_live_list',{p_actor:a});assert.ok(Number.isFinite(Date.parse(ownerRows[0].updatedAt)));assert.deepEqual(ownerRows.map(({updatedAt,...row})=>row),[{id:sid,version:0,generation:1,closed:false,isOwner:true}]);
 assert.deepEqual((await rpc('ops_live_list',{p_actor:b})).map(({updatedAt,...row})=>row),[{id:sid,version:0,generation:1,closed:false,isOwner:false}]);
 assert.deepEqual(await rpc('ops_live_list',{p_actor:c}),[]);
 const directory=actor=>rpc('community_live_sessions',{p_actor:actor,p_session_id:null});
 assert.equal((await directory(a)).length,0);assert.equal((await directory(b)).length,1);
 for(const phase of ['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED']){
  await db.query('update coaching_remote_sessions set state=$1 where id=$2',[{session:{mode:'full_blind',participants:[{name:'secret'}]},search:{phase,gpsSearch:{secret:true}},messages:['secret']},sid]);
  assert.equal((await directory(b)).length,0);
  assert.deepEqual(await live(b),[{id:sid,status:'ended',ended:true,owner_id:null}]);
  assert.deepEqual(await live(c),[]);
 }
 await db.query('update coaching_remote_sessions set state=$1 where id=$2',[{session:{mode:'normal',control:{departures:[{participantId:b}]}},search:{phase:'SEARCH_RUNNING'}},sid]);
 assert.equal((await directory(b)).length,1);
 await db.query('update coaching_remote_sessions set state=$1 where id=$2',[{session:{mode:'normal',control:{departures:[{participantId:a}]}},search:{phase:'SEARCH_RUNNING',gpsSearch:{secret:true}}},sid]);
 for(const mode of ['normal','simple_blind','full_blind']){
  await db.query('update coaching_remote_sessions set state=$1 where id=$2',[{liveEndedAt:12345,session:{mode},search:{phase:'SEARCH_RUNNING',gpsSearch:{secret:true}},tracer:{gpsPose:{secret:true}}},sid]);
  assert.equal((await directory(b)).length,0);assert.deepEqual(await live(b),[{id:sid,status:'ended',ended:true,owner_id:mode==='full_blind'?null:a}]);
 }
 await db.query('update coaching_remote_sessions set state=$1 where id=$2',[{liveEndedAt:12345,session:{mode:'normal'},search:{phase:'SEARCH_RUNNING',gpsSearch:{secret:true}}},sid]);
 const before=(await db.query('select state from coaching_remote_sessions where id=$1',[sid])).rows[0].state;
 assert.equal((await directory(b)).length,0);assert.deepEqual(await live(b),[{id:sid,status:'ended',ended:true,owner_id:a}]);
 assert.deepEqual((await db.query('select state from coaching_remote_sessions where id=$1',[sid])).rows[0].state,before);
 await rpc('ops_live_habitual',{p_actor:a,p_owner:a,p_user:b,p_enabled:false});assert.deepEqual(await live(b),[]);
 await rpc('ops_live_habitual',{p_actor:a,p_owner:a,p_user:b,p_enabled:true});
 await db.query('update coaching_remote_users set enabled=false where id=$1',[a]);assert.deepEqual(await live(b),[]);await db.query('update coaching_remote_users set enabled=true where id=$1',[a]);
 await db.exec('update private.community_friendship_control set enabled=false');await assert.rejects(live(b));await db.exec('update private.community_friendship_control set enabled=true');
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from community_social_edges'));await assert.rejects(db.query('select community_live_sessions($1)',[b]));await assert.rejects(db.query('select ops_live_list($1)',[b]));
 }finally{await db.close();}});
