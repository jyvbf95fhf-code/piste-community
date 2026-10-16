// Local PostgreSQL/WASM only. No Supabase client, credential or network call.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PISTE_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();let checks=0;
const run=async(name,fn)=>{await fn();checks++;console.log('PASS',name);};
const owner='11111111-1111-4111-8111-111111111111',observer='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',pub=crypto.randomUUID();
const query=(sql,args=[])=>db.query(sql,args);const scalar=async(sql,args=[])=>Object.values((await query(sql,args)).rows[0])[0];
async function command(id,actor,type,payload={},expected){const version=expected??await scalar('select version from public.ops_live_publications where id=$1',[id]);return scalar('select public.ops_live_commit($1,$2,$3,$4,$5,$6::jsonb)',[id,actor,crypto.randomUUID(),version,type,JSON.stringify(type==='publish'?{...payload,creationExpiresAt:new Date(Date.now()+300000).toISOString(),creationPurpose:version===-1?'create':'republish',creationExpectedVersion:version}:payload)]);}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;grant service_role to postgres;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
 create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;
 create function realtime.topic() returns text language sql stable as $$select current_setting('test.topic',true)$$;
 grant usage on schema auth,realtime to authenticated;grant execute on function auth.uid(),realtime.topic() to authenticated;
 create table public.coaching_sentinel(id int);insert into public.coaching_sentinel values(1);
 create table public.archive_sentinel(id int);insert into public.archive_sentinel values(1);
 grant select on public.archive_sentinel,public.coaching_sentinel to service_role;`);
 for(const user of [owner,observer,other])await query('insert into auth.users values($1)',[user]);
 for(const file of ['01-schema-rls.proposed.sql','02-realtime-retention.proposed.sql','04-api-transactions.proposed.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 await run('all proposed SQL loads into local PostgreSQL',async()=>assert.equal(await scalar("select count(*)::int from information_schema.tables where table_schema='public' and table_name in ('ops_live_publications','ops_live_access','ops_live_invites','ops_live_commands','ops_live_points')"),5));
 await run('signed-in users and visitors cannot read tables or execute privileged RPCs',async()=>{
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(query('select * from public.ops_live_publications'),/permission denied/);await assert.rejects(query('select public.ops_live_list($1)',[owner]),/permission denied/);await db.exec('reset role');}});
 await db.exec('set role service_role');
 await run('habitual permission is preserved and sharing remains explicit',async()=>{
 await scalar('select public.ops_live_habitual($1,$1,$2,true)',[owner,observer]);
 await command(pub,owner,'publish',{localMissionId:'local-mission',options:{showDog:true,showHandler:false,showEvents:false,showTrackAge:true,showCorridor:true},notifyObservers:true,metadata:{state:'En cours',dogName:'Nox',handlerName:'Private handler',trackingSeconds:0}},-1);
 assert.equal(await scalar('select public.ops_live_authorized($1,$2)',[pub,observer]),true);
 const read=await scalar('select public.ops_live_read($1,$2)',[pub,observer]);assert.equal(read.metadata.dogName,'Nox');assert.equal(read.metadata.handlerName,undefined);
 assert.equal(await scalar('select notification_version from public.ops_live_access where publication_id=$1 and user_id=$2',[pub,observer]),0);
 });
 await run('third party cannot read or mutate a mission',async()=>{await assert.rejects(query('select public.ops_live_read($1,$2)',[pub,other]),/access_denied/);await assert.rejects(command(pub,observer,'close'),/access_denied/);});
 await run('nested sensitive fields are rejected at SQL boundary',async()=>{await assert.rejects(command(pub,owner,'update',{metadata:{state:'En cours',events:[{type:'Indice',note:'SECRET'}]}}),/invalid_metadata/);});
 let batchId=crypto.randomUUID(),payload;let initialVersion;
 await run('differential GPS preserves segments and never bridges interruption',async()=>{
 const start=Date.now();payload={generation:1,points:[{sequence:1,segmentId:'first',latitude:48,longitude:7,accuracy:5,capturedAt:new Date(start).toISOString()},{sequence:2,segmentId:'first',latitude:48.0001,longitude:7,accuracy:5,capturedAt:new Date(start+100).toISOString()},{sequence:3,segmentId:'gap',latitude:49,longitude:8,accuracy:5,capturedAt:new Date(start+200).toISOString()}]};initialVersion=await scalar('select version from public.ops_live_publications where id=$1',[pub]);
 await scalar('select public.ops_live_commit($1,$2,$3,$4,$5,$6)',[pub,owner,batchId,initialVersion,'gps-batch',payload]);
 const distance=await scalar('select distance_m from public.ops_live_publications where id=$1',[pub]);assert.ok(distance>11&&distance<12);assert.equal(await scalar('select count(distinct segment_id)::int from public.ops_live_points where publication_id=$1',[pub]),2);
 });
 await run('lost acknowledgement replay is idempotent and changed payload is refused',async()=>{
 await scalar('select public.ops_live_commit($1,$2,$3,$4,$5,$6)',[pub,owner,batchId,initialVersion,'gps-batch',payload]);assert.equal(await scalar('select count(*)::int from public.ops_live_points where publication_id=$1',[pub]),3);
 await assert.rejects(query('select public.ops_live_commit($1,$2,$3,$4,$5,$6)',[pub,owner,batchId,initialVersion,'gps-batch',{generation:1,points:[]}]),/command_reused/);
 });
 await run('invitation is nominative and single-use',async()=>{const token='a'.repeat(64);await command(pub,owner,'invite',{recipientId:other,tokenHash:token,expiresAt:new Date(Date.now()+10000).toISOString()});await assert.rejects(command(pub,observer,'join',{tokenHash:token}),/invalid_invite/);await command(pub,other,'join',{tokenHash:token});await assert.rejects(command(pub,other,'join',{tokenHash:token}),/invite_consumed/);});
 await run('individual revocation blocks reads immediately and rotates realtime destination',async()=>{const before=await scalar('select channel_epoch from public.ops_live_publications where id=$1',[pub]);await command(pub,owner,'revoke',{userId:other});assert.notEqual(await scalar('select channel_epoch from public.ops_live_publications where id=$1',[pub]),before);await assert.rejects(query('select public.ops_live_read($1,$2)',[pub,other]),/access_denied/);});
 await run('closed mission stays readable for existing observer and rejects late data',async()=>{await command(pub,owner,'close');const read=await scalar('select public.ops_live_read($1,$2)',[pub,observer]);assert.equal(read.closed,true);assert.equal(read.metadata.state,'Fin de piste');await assert.rejects(command(pub,owner,'gps-batch',payload),/publication_closed/);await assert.rejects(command(pub,owner,'invite',{recipientId:other,tokenHash:'b'.repeat(64),expiresAt:new Date(Date.now()+10000).toISOString()}),/publication_closed/);});
 await run('default closed retention is seven days',async()=>assert.equal(await scalar('select extract(epoch from purge_at-closed_at)::int from public.ops_live_publications where id=$1',[pub]),604800));
 await run('habitual revocation also revokes current sessions and future automatic grants',async()=>{await scalar('select public.ops_live_habitual($1,$1,$2,false)',[owner,observer]);assert.equal(await scalar('select public.ops_live_authorized($1,$2)',[pub,observer]),false);});
 await run('expiration denies access even before physical purge',async()=>{await command(pub,owner,'retention',{seconds:0});await assert.rejects(query('select public.ops_live_read($1,$2)',[pub,owner]),/access_denied/);});
 await run('physical purge removes only expired Live data, preserves habitual preferences and archives',async()=>{assert.equal(await scalar('select public.ops_live_purge_expired(100)'),1);assert.equal(await scalar('select count(*)::int from public.ops_live_points'),0);assert.equal(await scalar('select count(*)::int from public.ops_live_commands'),0);assert.equal(await scalar('select count(*)::int from public.ops_live_access'),1);assert.equal(await scalar('select count(*)::int from public.archive_sentinel'),1);assert.equal(await scalar('select count(*)::int from public.coaching_sentinel'),1);});
 await run('late commands never recreate a purged publication',async()=>await assert.rejects(command(pub,owner,'gps-batch',payload,0),/not_available|expired/));

 await run('stopped mission can be republished without restoring old per-mission grants',async()=>{
 const id=crypto.randomUUID();await command(id,owner,'publish',{localMissionId:'restart-mission',metadata:{state:'En cours',trackingSeconds:100}},-1);
 assert.deepEqual(await scalar('select projection_options from public.ops_live_publications where id=$1',[id]),{showDog:true,showHandler:true,showEvents:true,showTrackAge:true,showCorridor:true});
 await command(id,owner,'invite',{recipientId:other,tokenHash:'c'.repeat(64),expiresAt:new Date(Date.now()+10000).toISOString()});await command(id,other,'join',{tokenHash:'c'.repeat(64)});
 await command(id,owner,'stop-sharing');await command(id,owner,'publish',{localMissionId:'restart-mission',metadata:{state:'En cours',trackingSeconds:100},options:{showDog:false},notifyObservers:false});
 assert.equal(await scalar('select generation::int from public.ops_live_publications where id=$1',[id]),2);
 assert.equal(await scalar('select public.ops_live_authorized($1,$2)',[id,other]),false);
 await assert.rejects(command(id,owner,'update',{metadata:{state:'En cours'}}),/duration_regression/);
 await assert.rejects(command(id,owner,'update',{metadata:{state:'En cours',trackingSeconds:null}}),/duration_regression/);
 await assert.rejects(command(id,owner,'update',{metadata:{state:'En cours',trackingSeconds:1}}),/duration_regression/);
 });
 await run('deleting Live content blocks immediate replay and expired creation tickets',async()=>{
 const id=crypto.randomUUID(),payload={creationPurpose:'create',creationExpectedVersion:-1,localMissionId:'delete-mission',creationExpiresAt:new Date(Date.now()+300000).toISOString()};const cmd=crypto.randomUUID();
 await scalar('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[id,owner,cmd,payload]);
 await scalar('select public.ops_live_delete($1,$2)',[id,owner]);
 assert.equal(await scalar('select projection_metadata from public.ops_live_publications where id=$1',[id]).then(x=>Object.keys(x).length),0);
 await assert.rejects(query('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[id,owner,cmd,payload]),/expired/);
 const expired={creationPurpose:'create',creationExpectedVersion:-1,localMissionId:'expired-create',creationExpiresAt:new Date(Date.now()-1).toISOString()};
 await assert.rejects(query('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[crypto.randomUUID(),owner,crypto.randomUUID(),expired]),/creation_expired/);
 });
 await run('sharing a running mission accepts earlier real GPS from its bounded capture start',async()=>{
 const id=crypto.randomUUID(),start=Date.now()-10000;await command(id,owner,'publish',{localMissionId:'already-running',captureStartedAt:new Date(start).toISOString()},-1);
 await command(id,owner,'gps-batch',{generation:1,points:[{sequence:1,segmentId:'before-live',latitude:48,longitude:7,accuracy:5,capturedAt:new Date(start+1000).toISOString()}]});
 assert.equal(await scalar('select count(*)::int from public.ops_live_points where publication_id=$1',[id]),1);
 });
 await run('notification records preserve the existing in-app contract and mark-read',async()=>{
 await scalar('select public.ops_live_habitual($1,$1,$2,true)',[owner,observer]);const id=crypto.randomUUID();
 await command(id,owner,'publish',{localMissionId:'notification-mission',notifyObservers:true,metadata:{state:'En cours',dogName:'Nox'}},-1);
 const notices=await scalar('select public.ops_live_notifications($1)',[observer]);assert.ok(notices.some(n=>n.session_id===id&&n.route==='/live/ops/'+id&&n.observer_role==='ops_trace_observer'));
 await command(id,observer,'mark-notification-read');const seen=await scalar('select public.ops_live_notifications($1)',[observer]);assert.equal(seen.find(n=>n.session_id===id).read,true);
 const targets=await scalar('select public.ops_live_signal_targets($1,$2)',[id,owner]);assert.ok(targets.users.includes(observer));assert.doesNotMatch(JSON.stringify(targets),/latitude|longitude|Nox/);
 });

 await run('republication tickets cannot create a missing publication',async()=>{
 const payload={creationPurpose:'republish',creationExpectedVersion:5,localMissionId:'old',creationExpiresAt:new Date(Date.now()+300000).toISOString()};
 await assert.rejects(query('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[crypto.randomUUID(),owner,crypto.randomUUID(),payload]),/not_available/);
 });
 await run('expired creation ticket can recover an existing acknowledgement but cannot create anew',async()=>{
 const id=crypto.randomUUID(),cmd=crypto.randomUUID(),payload={creationPurpose:'create',creationExpectedVersion:-1,localMissionId:'lost-create-ack',creationExpiresAt:new Date(Date.now()+500).toISOString()};
 await scalar('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[id,owner,cmd,payload]);
 await new Promise(resolve=>setTimeout(resolve,550));
 const ack=await scalar('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[id,owner,cmd,payload]);assert.equal(ack.acknowledged,true);
 await scalar('select public.ops_live_delete($1,$2)',[id,owner]);
 assert.equal(await scalar('select count(*)::int from public.ops_live_publications where id=$1',[id]),0);
 await assert.rejects(query('select public.ops_live_commit($1,$2,$3,-1,$$publish$$,$4)',[id,owner,cmd,payload]),/creation_expired/);
 });
 await run('24h active expiry freezes Live and retains final projection for seven days',async()=>{
 const id=crypto.randomUUID();await command(id,owner,'publish',{localMissionId:'expire-active',metadata:{state:'En cours'}},-1);
 await query("update public.ops_live_publications set created_at=now()-interval '2 hours',active_deadline=now()-interval '1 second' where id=$1",[id]);
 await scalar('select public.ops_live_purge_expired(100)');
 const final=await scalar('select public.ops_live_read($1,$2)',[id,owner]);assert.equal(final.closed,true);assert.equal(final.metadata.state,'Fin de piste');
 assert.equal(await scalar('select extract(epoch from purge_at-closed_at)::int from public.ops_live_publications where id=$1',[id]),604800);
 });
 await db.exec('reset role');
 await run('emergency withdrawal removes only OPS permissions',async()=>{await db.exec(await readFile(new URL('03-emergency-disable.proposed.sql',import.meta.url),'utf8'));await db.exec('set role service_role');await assert.rejects(query('select * from public.ops_live_publications'),/permission denied/);await db.exec('reset role');assert.equal(await scalar('select count(*)::int from public.archive_sentinel'),1);});
 console.log(JSON.stringify({status:'PASS',checks,engine:'PGlite 0.5.10 / local PostgreSQL WASM',remoteCalls:0}));
}finally{await db.close();}
