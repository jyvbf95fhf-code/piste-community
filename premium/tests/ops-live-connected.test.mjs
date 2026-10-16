import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createOpsLiveRemote} from '../src/ops-live-remote.mjs';import {createOpsLiveProposedHandler} from '../src/server/ops-live-http.mjs';
import {mission,policy,at} from './helpers/ops-live-fixture.mjs';
test('real controller, HTTP handler and local PostgreSQL: offline replay, GPS, options, notifications and closure',async()=>{
 const {PGlite}=await import(process.env.PISTE_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;create schema realtime;create table realtime.messages(extension text);create function realtime.topic() returns text language sql as $$select ''::text$$;`);
 await db.exec('create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz)');
 const owner='11111111-1111-4111-8111-111111111111',observer='22222222-2222-4222-8222-222222222222',third='33333333-3333-4333-8333-333333333333';for(const id of [owner,observer,third])await db.query('insert into auth.users values($1)',[id]);
 for(const file of ['01-schema-rls.proposed.sql','02-realtime-retention.proposed.sql','04-api-transactions.proposed.sql'])await db.exec(await readFile(new URL('../docs/ops-live-3b-proposal/'+file,import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261016120231_ops_live_invitations_index.sql',import.meta.url),'utf8'));
 const admin={rpc:async(name,args)=>{try{const keys=Object.keys(args);const r=await db.query(`select public.${name}(${keys.map((k,i)=>`${k}=>$${i+1}`).join(',')}) as result`,keys.map(k=>typeof args[k]==='object'&&args[k]!==null?JSON.stringify(args[k]):args[k]));return {data:r.rows[0].result};}catch(error){return {error};}}};
 let account=owner;const handler=createOpsLiveProposedHandler({enabled:true,admin,authClient:{auth:{getUser:async()=>({data:{user:{id:account}}})}},isAccountEnabled:async()=>true,invitationKey:'a'.repeat(64)});
 let lose=false,interleave=true;const call=async body=>{if(interleave&&body.type==='gps-batch'){interleave=false;const changed=await admin.rpc('ops_live_commit',{p_id:body.id,p_actor:observer,p_command:crypto.randomUUID(),p_expected:body.expectedVersion,p_type:'mark-notification-read',p_payload:{}});assert.ok(changed.data);}const response=await handler(new Request('http://local',{method:'POST',headers:{authorization:'Bearer simulated-test-identity'},body:JSON.stringify(body)})),value=await response.json();if(!response.ok)throw Object.assign(Error(value.error),{status:response.status});if(lose&&body.type==='gps-batch'){lose=false;throw Error('lost acknowledgement');}return value.result;};
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 let serial=Promise.resolve();const locks={request:(_name,fn)=>{const next=serial.then(fn);serial=next.catch(()=>{});return next;}};
 let remote=createOpsLiveRemote({ownerId:owner,storage,call,locks});const secondTab=createOpsLiveRemote({ownerId:owner,storage,call,locks});await remote.setHabitual(observer,true);
 const source=mission();source.ownerUserId=owner;source.gpsOwnerId=owner;source.gpsTrack.actorId=owner;source.gpsTrack.startedAt+=Date.now()-at-10000;const shift=source.gpsTrack.startedAt-at;
 for(const segment of source.gpsTrack.segments)for(const p of segment){p.timestamp+=shift;p.receivedAt+=shift;}
 const original=structuredClone(source);lose=true;await assert.rejects(remote.syncMission(source,policy),/lost acknowledgement/);
 remote.dispose();remote=createOpsLiveRemote({ownerId:owner,storage,call,locks});await remote.syncMission(source,policy);await secondTab.syncMission(source,policy);assert.equal((await db.query('select count(*)::int as n from public.ops_live_publications')).rows[0].n,1);await remote.refresh();
 const id=remote.view().sessions[0].id;assert.equal(remote.projection(id).gpsTrack.segments.flat().length,3);assert.equal(remote.projection(id).gpsTrack.segments.length,2);assert.deepEqual(source,original);
 account=observer;const notice=await call({operation:'notifications'});assert.equal(notice.length,1);assert.equal(notice[0].route,'/live/ops/'+id);
 account=owner;await remote.invite(id,third);account=third;const invitations=await call({operation:'invitations'});assert.equal(invitations.length,1);assert.equal(invitations[0].tokenHash,undefined);const watcher=createOpsLiveRemote({ownerId:third,storage,call});await watcher.acceptInvite(id);await watcher.refresh();assert.equal(watcher.projection(id).gpsTrack.segments.length,2);
 account=owner;await remote.revoke(id,third);account=third;await watcher.refresh();assert.equal(watcher.projection(id),null);watcher.dispose();
 account=owner;source.trackingState='stopped';source.status='À compléter';await remote.syncMission(source,policy);await remote.refresh();assert.equal(remote.projection(id).state,'Fin de piste');
 assert.equal((await db.query('select count(*)::int as n from public.ops_live_points')).rows[0].n,3);
 await remote.syncMission(source,{...policy,share_live:false});assert.equal((await db.query('select sharing from public.ops_live_publications')).rows[0].sharing,false);
 }finally{await db.close();}
});
